// 사운드 효과. 외부 음원 파일 없이 Web Audio API 오실레이터로 그때그때 합성한다
// (다른 비주얼 요소가 전부 Canvas 도형인 것과 같은 원칙 — 리소스 파일 없음).

let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

/** 브라우저는 사용자 제스처 전에는 소리를 재생하지 못한다 — 첫 클릭에서 잠금을 푼다. */
export function unlockAudio() {
  const c = getCtx();
  if (c.state === 'suspended') c.resume();
}

function unlockOnce() {
  unlockAudio();
  window.removeEventListener('mousedown', unlockOnce);
}
window.addEventListener('mousedown', unlockOnce);

/**
 * 오실레이터 하나로 짧은 효과음 한 개를 재생한다.
 * @param {{freq:number, freqEnd?:number, duration:number, type?:OscillatorType, gain?:number, delay?:number}} opts
 */
function tone({ freq, freqEnd = null, duration, type = 'sine', gain = 0.2, delay = 0 }) {
  const c = getCtx();
  if (c.state === 'suspended') return; // 아직 잠금 전이면 조용히 무시

  const start = c.currentTime + delay;
  const osc = c.createOscillator();
  const amp = c.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd !== null) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, start + duration);
  }

  amp.gain.setValueAtTime(gain, start);
  amp.gain.exponentialRampToValueAtTime(0.001, start + duration);

  osc.connect(amp);
  amp.connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** 와이어 발사 — 낮은 음에서 높은 음으로 짧게 훑는 '슝'. */
export function playWireFire() {
  tone({ freq: 380, freqEnd: 900, duration: 0.09, type: 'triangle', gain: 0.15 });
}

/** 와이어가 탑에 걸림 — 짧고 단단한 클릭음. */
export function playWireAttach() {
  tone({ freq: 220, freqEnd: 140, duration: 0.07, type: 'square', gain: 0.18 });
}

/** 동전 획득 — 금화는 은화보다 한 옥타브 위, 둘 다 살짝 반짝이는 2음 벨소리. */
export function playCoin(type) {
  const base = type === 'gold' ? 1046 : 784;
  tone({ freq: base, duration: 0.09, type: 'square', gain: 0.12 });
  tone({ freq: base * 1.5, duration: 0.11, type: 'square', gain: 0.08, delay: 0.05 });
}

/** 퍼펙트 보너스 — 코인 소리보다 화려한 3음 아르페지오. */
export function playPerfect() {
  [880, 1108, 1318].forEach((freq, i) => {
    tone({ freq, duration: 0.12, type: 'square', gain: 0.12, delay: i * 0.06 });
  });
}

/** 낭떠러지로 추락 — 짧게 뚝 떨어지는 하강음. */
export function playFall() {
  tone({ freq: 300, freqEnd: 70, duration: 0.25, type: 'sawtooth', gain: 0.15 });
}

/** 전체 클리어 — 상승하는 4음 팡파르. */
export function playClear() {
  [523, 659, 784, 1046].forEach((freq, i) => {
    tone({ freq, duration: 0.22, type: 'triangle', gain: 0.18, delay: i * 0.13 });
  });
}
