# Gemini Function Calling으로 TMDB 영화 에이전트 만들기

Gemini의 `interactions` API(function calling)로 TMDB 영화 정보를 조회하는 대화형 에이전트 구현 진행. 새로 나온 preview API라 참고 자료가 거의 없어서, 에러가 날 때마다 SDK 소스를 직접 읽으며 원인 추적함.

전체 코드: [`tmdb_agent.ipynb`](./tmdb_agent.ipynb)

## 목표

- TMDB API로 영화 목록/상세정보/검색/평점 상위 목록을 가져오는 함수 작성
- 위 함수들을 Gemini가 도구(tool)로 호출하도록 등록
- 사용자 질문 → 필요시 도구 호출 → 결과 재전달 → 최종 답변, 이 흐름을 자동화한 `run_agent` 작성
- 한 번 묻고 끝나지 않고 종료할 때까지 대화 유지

## 실행 준비

`python/gemini/.env`에 아래 값 필요 (`.gitignore`로 제외, 저장소엔 포함 안 됨).

```
GEMINI_API_KEY=발급받은 Gemini API 키
GEMINI_MODEL=gemini-3.5-flash-lite   # 생략 시 기본값
tmdb_token=TMDB API 접근 토큰(Bearer)
```

## 함수 구성

**TMDB 호출 (`get_post`, `get_searching_movie`, `get_credits`)**
- `get_post(client, option, page)`: `/movie/{option}` 호출. `option`엔 `now_playing`/`popular`/`top_rated`/`upcoming` 같은 목록 종류 또는 `movie_id`가 그대로 들어감 (TMDB 엔드포인트가 둘 다 `/movie/{id_or_category}` 형태라 재사용)
- `get_searching_movie(client, search, page)`: `/search/movie`에 검색어로 조회
- `get_credits(client, movie_id)`: `/movie/{movie_id}/credits`로 출연진 조회

**도구 함수 (Gemini가 호출하는 대상, `TOOL_FUNCTIONS`에 등록)**
- `get_movie_list(option, pages)`: 목록 종류 하나를 여러 페이지 동시 요청(`asyncio.gather`)해서 합침
- `get_movie_detail(movie_id)`: 상세정보 + 출연진을 동시에 조회해서 합쳐서 반환 (주요 출연진 10명, 이름/배역만 추림)
- `search_movies(search, pages)`: 검색어로 여러 페이지 검색 결과를 합쳐서 반환
- `get_top_rated_movies(option, pages, result_count, min_vote_count)`: 목록을 여러 페이지 가져온 뒤 `vote_count`(평가 수)가 `min_vote_count` 이상인 것만 남기고 `vote_average`(평점) 내림차순 정렬, 상위 `result_count`개만 반환. 평가 수가 적은 영화가 평점만으로 상위에 뜨는 걸 막기 위해 필터를 넣음

모든 도구 함수는 성공 시 `{"ok": True, "data": ...}`, 실패 시 `{"ok": False, "error": "..."}`로 리턴 형태를 통일.

**실행 흐름 (`execute_tool_call`, `run_agent`)**
- `execute_tool_call(step)`: Gemini가 요청한 도구 이름으로 `TOOL_FUNCTIONS`에서 함수를 찾아 `step.arguments`로 호출. 등록 안 된 도구거나 인자가 안 맞으면 에러 dict 반환
- `run_agent(user_input, previous_interaction_id, max_turns)`: 사용자 입력을 보내고, 응답에 함수 호출이 있으면 `asyncio.gather`로 동시 실행한 뒤 결과를 다시 Gemini에 전달 — 함수 호출이 없어질 때까지(최대 `max_turns`) 반복. 마지막에 다음 턴에 이어 쓸 `previous_interaction_id`를 같이 반환

**대화 루프**
- 마지막 셀에서 `while True`로 입력을 계속 받고, `run_agent`가 반환한 `previous_interaction_id`를 다음 호출에 넘겨서 대화 맥락 유지
- "종료"/"exit"/"quit"/"그만" 입력 시 루프 종료

## 겪은 문제

### 1. 동기 함수 → 비동기 전환

여러 페이지를 동시에 요청하고 도구를 병렬로 실행하려고 전체를 비동기로 전환. 이 과정에서 몇 가지 실수를 반복했다.

- `execute_tool_call` 내부에서 `await` 없이 `tool_function(**step.arguments)` 호출, 결과 대신 coroutine 객체가 그대로 반환됨
- `run_agent`를 `async def`로 바꾸고 호출부는 그대로 둬서 `TypeError: 'coroutine' object is not subscriptable` 발생. `await run_agent(...)`로 수정
- `next_input.append = {...}` — `.append(...)` 호출이 아니라 `append` 속성 자체에 값을 대입한 오타. `AttributeError`로 바로 드러남

### 2. 도구 명세 포맷이 API마다 다름

도구 스펙을 Claude 스타일(`input_schema`)로 작성했다가 아래 에러 발생.

```
ValidationError: Tool: expected object with 'type' field [type=value_error, input_value={}, input_type=dict]
```

이 API는 최상위에 `"type": "function"` 필요, 파라미터 키도 `parameters`. 그리고 도구 딕셔너리의 `"name"`이 `TOOL_FUNCTIONS`의 키와 철자까지 일치해야 라우팅됨 — `get_movie_list` vs `get_movie_list_tool`로 불일치했던 부분 뒤늦게 발견.

### 3. 죽은 코드가 원인이었던 문제

"현재 상영중인 영화 중 평점 높은 거" 질문에 2024년 영화로 답변. `tool_logs` 확인해보니 비어있음 — 도구 호출 자체가 없었음. 원인은 같은 셀에 남아있던 예전 테스트 코드.

```python
# 처음 시작
user_input = input()
interaction = client.interactions.create(..., input=user_input, ...)  # tools=TOOLS 없음
print(interaction.output_text)

user_input = input()  # 입력 재요청
result = await run_agent(user_input)
```

`input()`을 두 번 받는 구조라 첫 질문은 tools 없는 예전 코드가 처리하고, 두 번째 입력에만 `run_agent`가 적용됨. 죽은 코드가 남아있으면 증상이 엉뚱한 곳(API 데이터 문제)을 가리키는 것처럼 보인다는 걸 확인.

### 4. "Missing text in content of type text" 400 에러

function_result 재전달 요청에서 발생. 로컬 SDK 소스(`_gaos/types/interactions/functionresultstep.py`, `textcontent.py`)를 직접 읽고 pydantic 모델로 payload를 검증, 구조 자체엔 문제없음 확인. 결국 3번 문제(tools 없이 진행된 대화로 상태가 꼬인 것)와 얽혀서 발생한 에러였음.

## 배운 점

- async/await는 일부만 빠져도 조용히 잘못된 값이 전파됨
- preview API는 문서보다 SDK 소스(pydantic 모델) 직접 읽는 게 빠를 때가 있음
- 원인 불명 에러는 새 버그를 의심하기 전에 남아있는 예전 코드부터 확인
