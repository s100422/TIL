const moodInput = document.getElementById("mood");
const budgetSelect = document.getElementById("budget");
const btn = document.getElementById("recommend-btn");
const result = document.getElementById("result");
const banner = document.getElementById("banner");
const character = document.getElementById("character");

function showResult(html, isError = false) {
  result.innerHTML = html;
  result.classList.remove("hidden");
  result.classList.toggle("error", isError);
  result.classList.remove(...ALL_MOOD_CLASSES);
}

const MOOD_RULES = [
  { test: (e, w) => e === "angry", emoji: "😠", className: "mood-angry" },
  { test: (e, w) => w === "rain", emoji: "☔", className: "mood-rain" },
  { test: (e, w) => e === "sad" || e === "tired", emoji: "😪", className: "mood-tired" },
  { test: (e, w) => e === "happy", emoji: "😋", className: "mood-happy" },
  { test: (e, w) => w === "hot", emoji: "🥵", className: "mood-hot" },
  { test: (e, w) => w === "cold", emoji: "🥶", className: "mood-cold" },
];
const DEFAULT_MOOD = { emoji: "🙂", className: "mood-neutral" };
const ALL_MOOD_CLASSES = MOOD_RULES.map((r) => r.className).concat(DEFAULT_MOOD.className);

function pickMood(emotion, weather) {
  const rule = MOOD_RULES.find((r) => r.test(emotion, weather));
  return rule || DEFAULT_MOOD;
}

async function recommend() {
  const mood = moodInput.value.trim();
  const budget = budgetSelect.value;

  if (!mood) {
    showResult("<p>기분이나 날씨를 입력해주세요.</p>", true);
    return;
  }

  btn.disabled = true;
  btn.textContent = "추천 중...";
  banner.classList.add("compact");
  character.classList.add("loading");
  character.textContent = "🤔";
  showResult("<p>추천을 받아오는 중이에요...</p>");

  try {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, budget }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "추천을 가져오지 못했어요.");
    }

    const moodStyle = pickMood(data.emotion, data.weather);
    character.textContent = moodStyle.emoji;
    showResult(`<h2>${data.menu}</h2><p>${data.reason}</p>`);
    result.classList.add(moodStyle.className);
  } catch (err) {
    character.textContent = "😵";
    showResult(`<p>${err.message}</p>`, true);
  } finally {
    character.classList.remove("loading");
    btn.disabled = false;
    btn.textContent = "추천해줘";
  }
}

btn.addEventListener("click", recommend);
