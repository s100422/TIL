// 캔버스 셋업 및 리사이즈 담당.
// 게임 로직은 항상 아래 논리 해상도(GAME_WIDTH x GAME_HEIGHT) 좌표계로만 계산하고,
// 실제 표시 크기는 이 모듈이 창 크기에 맞춰 스케일링한다.

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('game-container');

/** 현재 컨테이너 크기에 맞춰 캔버스 해상도와 표시 크기를 갱신한다. */
function resize() {
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  // 레이아웃이 아직 확정되지 않은 시점(0x0)에는 건너뛴다. ResizeObserver가 다시 호출해준다.
  if (cw === 0 || ch === 0) return;

  const scale = Math.min(cw / GAME_WIDTH, ch / GAME_HEIGHT);

  // CSS 표시 크기: 비율 유지하며 창에 맞춤
  canvas.style.width = `${GAME_WIDTH * scale}px`;
  canvas.style.height = `${GAME_HEIGHT * scale}px`;

  // 실제 픽셀 버퍼: 고해상도 디스플레이에서도 선명하게
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(GAME_WIDTH * scale * dpr);
  canvas.height = Math.round(GAME_HEIGHT * scale * dpr);

  // 이후 모든 드로잉은 논리 좌표계(960x540)로 하면 된다.
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

// ResizeObserver는 관찰 시작 시점과 이후 모든 크기 변화에 대해 호출되므로,
// 초기 레이아웃 타이밍 문제 없이 캔버스 크기가 항상 맞춰진다.
new ResizeObserver(resize).observe(container);
resize();

export { canvas, ctx };
