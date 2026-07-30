# 오늘 뭐 먹지?

기분/날씨와 예산을 입력하면 Gemini가 오늘 먹을 메뉴를 추천해주는 간단한 웹앱.

## 서비스 소개

- **서비스명**: 오늘 뭐 먹지?
- **하는 일**: 지금 기분/날씨와 예산을 입력하면, Gemini가 오늘 먹을 메뉴 하나와 추천 이유를 알려준다.
- **사용한 AI 기능**: 사용자가 입력한 기분/날씨/예산 텍스트를 Gemini에게 전달해서, 메뉴 이름·추천 이유(발랄한 말투)·감정(emotion)·날씨(weather) 분류 태그까지 하나의 JSON 응답으로 한 번에 생성해달라고 요청함. emotion/weather 태그는 캐릭터 이모지와 결과 카드 색상을 바꾸는 데 사용.
- **막혔던 지점과 해결 방법**: 토큰을 너무 많이 쓰지 않기 위해 기능을 AI와 이야기하면서 기능이나 디자인을 조절함.

## 실행 방법

```bash
pip install -r requirements.txt
```

`.env` 파일에 Gemini API 키가 필요합니다.

```
API_KEY=your_gemini_api_key
```

서버 실행:

```bash
uvicorn main:app --reload --port 8000
```

브라우저에서 http://127.0.0.1:8000 접속.

## 구조

- `main.py` — FastAPI 서버, `/api/recommend`에서 Gemini 호출
- `static/` — 정적 프론트(HTML/CSS/JS)

자세한 기획은 [CLAUDE.md](CLAUDE.md) 참고.
