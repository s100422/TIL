# TODO — 오늘 뭐 먹지?

각 단계 완료 후 피드백 받고 다음 단계로 진행.

## 1단계 — 프로젝트 뼈대 ✅
- [x] `requirements.txt` 작성 (fastapi, uvicorn, python-dotenv, httpx)
- [x] `.env` 파일을 루트에서 복사 (API_KEY)
- [x] `main.py` 기본 골격: FastAPI 앱 생성, `static/` 폴더 서빙, `.env` 로드

## 2단계 — 정적 프론트 UI ✅
- [x] `static/index.html`: 기분/날씨 입력창, 예산 선택(select), "추천해줘" 버튼, 결과 표시 영역
- [x] `static/style.css`: 최소한의 스타일링
- [x] `static/app.js`: 버튼 클릭 시 `/api/recommend`로 POST, 결과를 화면에 렌더링, 로딩/에러 상태 표시

## 3단계 — Gemini 연동 백엔드 ✅
- [x] `POST /api/recommend` 엔드포인트 구현
- [x] mood/budget으로 프롬프트 구성 (JSON 형식으로만 응답하도록 강제)
- [x] Gemini API 호출 함수 작성
- [x] 응답 JSON 파싱 + 실패 시 에러 처리

## 4단계 — 로컬 테스트 ✅
- [x] `uvicorn main:app --reload`로 서버 실행
- [x] 브라우저에서 실제로 입력 → 추천 결과 받아보기 (골든 패스) — "김밥" 추천 확인됨
- [x] 엣지 케이스 확인: 입력 비어있을 때(프론트 검증 동작 확인), Gemini 응답이 JSON이 아니거나 필드 누락일 때(parse_recommendation 예외 발생 → /api/recommend가 500+error 반환 → 프론트 에러 스타일로 표시)

## 5단계 — 마무리 ✅
- [x] README 또는 실행 방법 간단 정리 (필요 시)
- [x] 최종 확인 및 피드백

## 6단계 — 캐릭터(이모지) + 배너 애니메이션 ✅
- [x] Gemini 프롬프트/JSON 스키마에 `emotion`, `weather` 필드 추가
- [x] `parse_recommendation`에 emotion/weather 기본값 처리 추가
- [x] `index.html`: 배너 + 캐릭터(이모지) 구조로 레이아웃 변경
- [x] `style.css`: 배너 축소 CSS transition, 캐릭터 로딩 바운스 애니메이션
- [x] `app.js`: 클릭 시 배너 축소 클래스 토글, 로딩 중 캐릭터 바운스, 결과 도착 시 emotion/weather → 이모지 매핑
- [x] 브라우저에서 화남(😠)/비(☔)/기쁨(😋) 케이스별로 이모지 바뀌는 것 확인

## 7단계 — 폰트/톤/색상/애니메이션 다듬기 ✅
- [x] 폰트 Gaegu → Jua로 교체, 전체 폰트 크기 확대 (너무 작다는 피드백 반영)
- [x] Gemini 프롬프트에 발랄한 말투 지시 추가 (`reason`이 이모지/느낌표 섞인 캐주얼한 톤으로 나오는지 확인)
- [x] 버튼 색상을 핑크-오렌지 그라데이션 + 입체 그림자로 변경, hover/active 모션 추가
- [x] 결과 카드 배경색을 emotion/weather 태그 기반으로 변경 (이모지와 동일한 우선순위 로직 재사용, `pickMood` 함수로 통합)
- [x] 캐릭터 축소 애니메이션을 font-size → transform(scale+translateY)로 교체, bounce easing 적용, 로딩 중에도 축소 상태 유지하도록 수정
