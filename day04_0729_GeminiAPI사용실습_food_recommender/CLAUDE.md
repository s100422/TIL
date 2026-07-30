# 오늘 뭐 먹지? — 기획 문서

## 개요
사용자가 기분/날씨와 예산을 입력하면 Gemini API가 오늘 먹을 메뉴 하나를 추천해주고, 왜 그 메뉴인지 이유를 설명해주는 아주 간단한 웹앱.

## 기술 스택
- 백엔드: FastAPI (Python)
- 프론트: 정적 HTML + CSS + Vanilla JS (별도 프레임워크 없음)
- LLM: Gemini API (`gemini-2.5-flash`), 기존 사주 프로젝트와 동일 모델 사용
- 실행: `uvicorn main:app --reload`
- 의존성: `fastapi`, `uvicorn`, `python-dotenv`, `httpx` (또는 `requests`)

## 폴더 구조 (루트 사주 프로젝트와 완전 분리)
```
food-recommender/
├── CLAUDE.md
├── TODO.md
├── main.py              # FastAPI 앱, /api/recommend 엔드포인트
├── requirements.txt
├── .env                 # API_KEY=... (루트 .env와 별개로 복사, 이미 .gitignore에 걸림)
└── static/
    ├── index.html
    ├── style.css
    └── app.js
```

## 추천 방식
- 미리 정한 메뉴 리스트 없음. 매 요청마다 Gemini가 메뉴 이름 + 추천 이유를 자유 생성.
- 서버는 사용자 입력을 프롬프트에 넣어 Gemini 호출 → 응답을 파싱해서 프론트에 전달.

## 사용자 입력 조건
- 기분/날씨: 자유 텍스트 또는 프리셋 몇 개(예: 기분 좋음/우울/피곤/추움/더움/비오는날) 중 선택. 자유 텍스트 입력창으로 시작.
- 예산: 프리셋 선택 (예: 저렴/보통/비쌈, 또는 대략적인 금액대)
- 두 값 모두 선택/입력 후 "추천해줘" 버튼 클릭

## API 명세
### `GET /`
- `static/index.html` 반환

### `POST /api/recommend`
요청 바디:
```json
{ "mood": "피곤하고 비 오는 날", "budget": "저렴" }
```
응답:
```json
{ "menu": "김치찌개", "reason": "비 오는 날 뜨끈한 국물이 당기고, 저렴한 예산에도 부담 없어요.", "emotion": "neutral", "weather": "rain" }
```
- Gemini에게 반드시 위 JSON 형식으로만 답하도록 프롬프트에서 강제 (예: "JSON으로만 응답, 다른 텍스트 없이")
- `emotion`은 `["happy","sad","angry","tired","neutral"]` 중 하나, `weather`는 `["sunny","rain","cold","hot","neutral"]` 중 하나로 Gemini가 mood 텍스트를 보고 분류
- Gemini 응답 파싱 실패 시 500 에러와 에러 메시지 반환

## 캐릭터 (디자인)
- 이미지 없이 이모지 하나로 표현. 별도 이미지 에셋 불필요.
- 초기 화면: 배너 위에 캐릭터 이모지가 얹혀있는 모습 (`🍽️` 기본값)
- "추천해줘" 클릭 시: 배너가 CSS transition으로 축소되면서 캐릭터도 함께 작아짐(순수 CSS, 이미지 애니메이션 없음). 로딩 중에는 캐릭터가 바운스하는 CSS 애니메이션 적용.
- 결과 도착 시: 응답의 `emotion`/`weather` 태그를 우선순위 규칙으로 매핑해 이모지 교체
  - `emotion === "angry"` → 😠
  - `weather === "rain"` → ☔
  - `emotion === "sad"` 또는 `"tired"` → 😪
  - `emotion === "happy"` → 😋
  - `weather === "hot"` → 🥵
  - `weather === "cold"` → 🥶
  - 기본값 → 🙂
- 표정+소품 동시 표현(레이어링) 없음. 이미지 시안/애니메이션 프레임 준비 불필요.
- 캐릭터 축소는 `font-size`가 아닌 `transform: scale + translateY`로 구현 (GPU 가속, 더 부드러움). 이징은 `cubic-bezier(0.34, 1.56, 0.64, 1)` (back-out, 살짝 오버슈트되는 통통 튀는 느낌).
- 제목(h1)은 캐릭터보다 0.08s 늦게 축소되어 캐릭터가 먼저 반응하고 텍스트가 뒤따르는 순서감 부여.
- 로딩 중 바운스 애니메이션은 축소된 상태(scale 0.5) 그대로 유지한 채 재생 (`bounce-compact` keyframes).

## 톤 & 비주얼 디자인
- 폰트: Google Fonts "Jua" (귀엽고 통통한 손글씨 느낌). 전체 기본 폰트 크기 17px, 제목 30px(축소 시 20px), 입력/버튼 18px.
- Gemini의 `reason` 필드는 발랄하고 통통 튀는 말투로 작성하도록 프롬프트에서 지시 (느낌표, 이모지 적극 사용, 친구한테 추천하듯 캐주얼한 톤).
- 버튼: 핑크→오렌지 그라데이션(`#ff6fa5` → `#ff9a3d`) + 아래쪽 그림자로 말랑한 입체감. hover 시 위로 살짝 떠오르고, 클릭 시 눌리는 모션.
- 결과 카드 배경색도 emotion/weather 태그로 캐릭터 이모지와 동일한 우선순위 규칙을 적용해 함께 변경 (`mood-angry`=연빨강, `mood-rain`=연파랑, `mood-tired`=연보라, `mood-happy`=연노랑, `mood-hot`=연주황, `mood-cold`=연하늘, 기본=크림색).

## 데이터 저장
- 저장 없음. 완전 stateless. DB, 파일 히스토리, 세션 없음.

## 인증/보안
- 로그인 없음, 단일 사용자 로컬 실행 전제.
- API_KEY는 `.env`에서만 로드, 프론트에 절대 노출하지 않음 (서버가 프록시 역할).

## 비범위 (하지 않는 것)
- 회원가입/로그인
- 추천 히스토리 저장 및 조회
- 실제 음식점/지도 연동
- 다국어 지원
