# TIL — AI 에이전트 엔지니어 과정

수업에서 배운 내용과 실습 결과를 매일 기록합니다.

> 완성된 결과물 중심의 포트폴리오는 별도 저장소에 정리하고 있습니다 → **[s100422/portfolio](https://github.com/s100422/portfolio)**

<br>

## 📅 학습 기록

| Day | 날짜 | 주제 | 핵심 내용 | 산출물 |
| :---: | :---: | :--- | :--- | :--- |
| **00** | — | [Git 워크플로우 & CLI 명령어](Day00_Git워크플로우_명령어.md) | Git 4단계 흐름(Working Directory → Staging → Local → Remote), 필수 명령어, PowerShell/Git Bash 명령어 비교 | 노트 |
| **01** | 07-24 | [AI 이해 — 나의 강점 찾기](day01_0724_AI이해_과제_나의강점) | Gemini와의 대화로 강점 도출 및 경험 기반 검증 | 노트 + 실습 화면 |
| **02** | 07-27 | [프롬프트 엔지니어링 & n8n 워크플로우](day02_0727_여러개의_시트_워크플로우) | Zero-shot / Few-shot / CoT / Self-Consistency / ReAct / Tree-of-Thought 정리<br>리뷰 분류 JSON 출력 실습, 구글폼 3개 → Merge → 조건 분기 → 메일 발송 자동화 | 노트 + 워크플로우 |
| **03** | 07-28 | [옥상 위 고군분투! — 와이어 액션 게임](day03_0728_옥상위_고군분투_와이어액션게임) | 순수 HTML/CSS/JS + Canvas 2D, ES 모듈 구조 분리, 와이어 진자 운동·관성 물리 구현 | 🎮 실행 가능한 게임 |
| **04** | 07-29 | [오늘 뭐 먹지? — Gemini 메뉴 추천](day04_0729_GeminiAPI사용실습_food_recommender) | FastAPI + Gemini API, 기분·날씨·예산 입력 → 메뉴·추천이유·분류태그를 단일 JSON으로 응답 | 🍽 실행 가능한 웹앱 |
| **05** | 07-30 | [n8n 날씨 + 오늘의 운세](day05_0730_API_n8n실습_날씨운세) | 날씨 API 호출 + AI Agent 사주/오행 분석을 하나의 메시지로 병합해 발송 | 노트 + 워크플로우 |
| **07-08** | 08-03~08-04 | [오늘은 배달이다! — Vercel/Supabase 실습](day07-08_Vercel_supabase_실습) | Next.js + Supabase(Auth/DB/RLS)로 배달 맛집 기록 서비스 제작, 카카오 로컬/맵 API + Gemini API로 근처 음식점 추천 기능 구현, Vercel 배포 | 실행 가능한 웹앱 → **[s100422/TodayIDeliver](https://github.com/s100422/TodayIDeliver)** |
| **09** | 08-05 | [미니프로젝트1 — 고객 VOC 자동 분류 & 긴급 알림](day09_0805_n8n_VOC자동분류알림) | 구글폼 문의를 n8n이 감지 → 이메일+물품번호로 중복 확인 → Gemini AI Agent가 분류/감정/긴급도/요약 판단(Structured Output Parser) → Code 노드로 결과값 검증 → 시트 저장 → 긴급도 '상'이면 디스코드 알림 | 노트 + 워크플로우 → **[s100422/mini-project1-voc-workflow](https://github.com/s100422/mini-project1-voc-workflow)** ([리포트 보기](https://s100422.github.io/mini-project1-voc-workflow/)) |
| **10** | 08-05~08-06 | [미니프로젝트2 — 금융 뉴스 브리핑 Agent](day10_0805_n8n_금융뉴스브리핑) | RSS 4개(미국2+한국2) 수집 → 발송이력 시트로 중복 제거 → 금융 무관 기사만 배제 → 기사 전체를 배치로 묶어 Gemini 1회 호출로 요약/중요도/카테고리 판단 → 응답 검증 및 안전 기본값 처리 → 중요도 4+ 만 디스코드 발송 + 이력 기록 | 노트 + 워크플로우 |
| **11** | 08-06~08-10 | [미니프로젝트3 — 배당 모아 해외여행](day11_0806_배당모아해외여행) | Next.js+Supabase+Gemini로 배당주 AI 포트폴리오 플래너 제작. `responseSchema`로 배분안 2개 강제 생성 + 환각/근거없음/비중합/월커버리지 4중 검증, Gemini 웹검색 그라운딩으로 배당 삭감·인상 리스크 배지, 연차별 배당성장 시뮬레이터는 서버가 결정론적으로 계산 | 실행 가능한 웹앱 → **[s100422/Miniproject3](https://github.com/s100422/Miniproject3)** (배포: [dividend-travel-planner.vercel.app](https://dividend-travel-planner.vercel.app/)) |
| **12-13** | 08-27~08-28 | [Gemini Function Calling — TMDB 영화 에이전트](day12-13_0827_Gemini_TMDB에이전트) | Gemini interactions API의 function calling으로 TMDB 영화 목록/상세/검색/평점상위 조회 도구 4종 구현, `asyncio.gather`로 병렬 실행, `previous_interaction_id`로 대화 맥락을 유지하는 `while` 루프형 에이전트 완성 | 노트 + 실습 코드 |

<br>

## 🔧 기억할 트러블슈팅

기록해둔 시행착오 중 다시 만날 가능성이 높은 것들입니다.

| Day | 문제 | 원인 | 해결 |
| :---: | :--- | :--- | :--- |
| 05 | n8n에서 날씨 정보와 운세 결과가 `Edit Fields`에서 합쳐지지 않음 | 두 노드를 같은 입력에 연결하면 n8n은 병합이 아니라 **연결마다 노드를 따로 실행**함. 한 item에 두 필드가 함께 존재한 적이 없었음 | `Merge` 노드를 추가하고 필드 표현식을 `{{ $('노드명').first().json.필드 }}` 로 명시적으로 지정 |
| 02 | AI가 음식 카테고리를 제대로 분류할지 확신이 없었음 | 분류 기준이 추상적이었음 | 실제 서비스의 카테고리 목록을 그대로 가져와 세분화 → 분류 정확도 확보 |
| 00 | PowerShell에서 `ls -a` / `ls -al` 에러 | `ls`는 리눅스 명령어가 아니라 PowerShell 별칭이라 리눅스 옵션을 인식하지 못함 | `ls -Force` 사용, 또는 터미널을 Git Bash로 변경 |
| 00 | 경로에 띄어쓰기가 있으면 `cd` 실패 | 터미널이 공백에서 인자를 끊어서 인식 | 경로 전체를 큰따옴표로 감싸기, `Tab` 자동완성 활용 |
| 09 | AI Agent에 Output Parser를 붙였는데 분류 결과가 계속 기본값(기타/중립/중)으로만 나옴 | Output Parser를 붙이면 응답이 `output` 키 안에 한 번 더 감싸져서 나온다는 걸 몰랐음 | `$json.category`가 아니라 `$json.output.category`로 접근 |
| 09 | 물품번호 "00001"처럼 앞자리 0이 있는 값이 시트에서 숫자로 바뀌어 중복 확인 매칭이 안 됨 | 구글 시트가 숫자처럼 보이는 문자열을 자동으로 숫자로 변환 | 시트 서식을 일반 텍스트로 변경 + 코드에서도 앞자리 0을 제거하고 비교하는 정규화 함수 추가 |
| 10 | 금융 키워드 필터가 미국 기사를 부당하게 많이 걸러냄(18건 중 미국 1건) | "키워드가 있어야 통과"(포함) 방식이 관용적인 영어 헤드라인엔 정확한 키워드가 잘 안 박혀서 언어 편향 발생 | "명백히 무관해야 제외"(배제) 방식으로 뒤집음 — 소스가 이미 전문 섹션이면 배제 방식이 recall에 더 안전 |
| 10 | 기사 한 건당 LLM 호출 → 18건이면 API 18번 호출되는 구조를 뒤늦게 발견 | 개별 처리 로직을 그대로 배치 데이터에 적용 | 기사 전체를 번호 매긴 목록 하나로 합쳐서 LLM에 통째로 넘기고 "입력 개수와 같은 길이 배열"로 응답받아 실행당 호출 1회로 고정 |
| 11 | Gemini에 웹검색 그라운딩(`tools:[{google_search:{}}]`)과 `responseSchema`(JSON 강제)를 같은 요청에 같이 쓰면 400 에러 | 두 기능이 같은 요청에서 상호 배타적 | 그라운딩 호출은 스키마 강제 없이 자유 텍스트로 받고 서버 코드가 직접 파싱 |
| 11 | 화면을 하나씩 만들다 보니 페이지마다 색감·타이포그래피·여백 톤이 제각각이 됨 | 디자인 시스템 없이 화면 단위로 작업 | 기능·레이아웃은 직접 짜고, [Stitch](https://stitch.withgoogle.com/)에 넣어 디자인 톤을 하나의 시스템으로 뽑아낸 뒤 그 기준으로 다시 코드에 입힘 |
| 12-13 | Gemini 도구(tool) 명세를 Claude 스타일(`input_schema`)로 작성했다가 `ValidationError` | 같은 "function calling"이어도 API마다 요구하는 스펙이 다름 — 이 API는 최상위 `"type": "function"` + `parameters` 키를 요구 | 붙여넣기 전에 그 API의 도구 스펙 포맷부터 확인, 도구 딕셔너리의 `name`이 라우팅에 쓰는 키와 철자까지 일치하는지도 같이 확인 |
| 12-13 | 최신 정보를 물었는데 실제로는 없는 옛날 정보로 답변, 도구 호출 로그도 비어있어서 원인을 API 쪽으로 의심함 | 같은 셀에 `tools` 없이 호출하던 예전 테스트 코드가 안 지워지고 남아있었음 | 새 버그를 의심하기 전에 셀/파일에 남아있는 예전 코드부터 확인 |

<br>

## 🧰 다뤄본 도구

`Git` · `GitHub` · `n8n` · `Google Forms / Sheets` · `Gemini API` · `Discord Webhook` · `FastAPI (Python)` · `HTML / CSS / JavaScript` · `Canvas 2D` · `Next.js` · `TypeScript` · `Supabase` · `Vercel` · `Stitch` · `TMDB API` · `httpx`

<br>

---

<sub>API 키 등 민감 정보는 `.env`로 분리하며 저장소에 커밋하지 않습니다.</sub>
