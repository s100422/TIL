import json
import os
import re
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

API_KEY = os.getenv("API_KEY")
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
)

app = FastAPI()
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")


class RecommendRequest(BaseModel):
    mood: str
    budget: str


def build_prompt(mood: str, budget: str) -> str:
    return f"""당신은 발랄하고 텐션 높은 음식 추천 전문가입니다. 아래 조건에 맞는 오늘 먹을 메뉴를 한 가지만 추천해주세요.

기분/날씨: {mood}
예산: {budget}

reason은 반드시 발랄하고 통통 튀는 말투로 작성하세요. 느낌표와 어울리는 이모지를 적극 활용하고, 딱딱한 설명체 대신 친구한테 신나게 추천하듯이 써주세요.

다음 두 값도 반드시 함께 분류하세요.
- emotion: mood 텍스트에서 느껴지는 감정. 반드시 happy, sad, angry, tired, neutral 중 하나의 단어만 사용.
- weather: mood 텍스트에 언급된 날씨. 반드시 sunny, rain, cold, hot, neutral 중 하나의 단어만 사용. 날씨 언급이 없으면 neutral.

반드시 아래 JSON 형식으로만 응답하세요. 마크다운, 코드블록, 다른 설명 없이 순수 JSON 한 줄만 출력하고, emotion/weather 자리에는 위에서 고른 단어를 그대로 채우세요. (아래는 형식 예시일 뿐 실제 값이 아닙니다)
{{"menu": "메뉴 이름", "reason": "이 메뉴를 추천하는 이유 (1~2문장)", "emotion": "neutral", "weather": "neutral"}}"""


async def call_gemini(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            GEMINI_URL,
            params={"key": API_KEY},
            json={"contents": [{"parts": [{"text": prompt}]}]},
        )
    data = res.json()
    if res.status_code != 200:
        raise RuntimeError(data.get("error", {}).get("message", "Gemini API 호출 실패"))
    return data["candidates"][0]["content"]["parts"][0]["text"]


def parse_recommendation(text: str) -> dict:
    cleaned = re.sub(r"^```(json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    parsed = json.loads(cleaned)
    if "menu" not in parsed or "reason" not in parsed:
        raise ValueError("응답에 menu/reason이 없습니다.")
    parsed.setdefault("emotion", "neutral")
    parsed.setdefault("weather", "neutral")
    return parsed


@app.get("/")
def index():
    return FileResponse(BASE_DIR / "static" / "index.html")


@app.post("/api/recommend")
async def recommend(req: RecommendRequest):
    try:
        prompt = build_prompt(req.mood, req.budget)
        text = await call_gemini(prompt)
        return parse_recommendation(text)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
