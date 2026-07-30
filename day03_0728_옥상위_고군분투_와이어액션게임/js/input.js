// 마우스 입력 수집. 이 게임의 모든 조작은 마우스 왼쪽 버튼 하나로 이루어진다.
//
// 누름/뗌은 '래치(latch)' 방식으로 모아둔다. 한 프레임 안에서 누르고 떼는 아주 빠른 클릭이
// 들어와도 두 이벤트를 모두 놓치지 않기 위함이다.

import { canvas, GAME_WIDTH, GAME_HEIGHT } from './canvas.js';

/** 현재 커서 위치(논리 좌표)와 버튼 유지 상태. */
export const mouse = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, down: false };

let pressLatch = false;
let releaseLatch = false;

/** 화면상의 실제 픽셀 좌표를 논리 좌표(960x540)로 변환한다. */
function updatePosition(e) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  mouse.x = ((e.clientX - rect.left) / rect.width) * GAME_WIDTH;
  mouse.y = ((e.clientY - rect.top) / rect.height) * GAME_HEIGHT;
}

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return; // 왼쪽 버튼만
  updatePosition(e);
  mouse.down = true;
  pressLatch = true;
});

// 뗌과 이동은 window에서 듣는다 — 캔버스 밖으로 커서가 나간 상태에서 떼도 놓치지 않도록.
window.addEventListener('mouseup', (e) => {
  if (e.button !== 0) return;
  updatePosition(e);
  mouse.down = false;
  releaseLatch = true;
});

window.addEventListener('mousemove', updatePosition);

/** 이번 프레임에 새로 눌렸는지. 한 번 읽으면 소비된다. */
export function consumePress() {
  const p = pressLatch;
  pressLatch = false;
  return p;
}

/** 이번 프레임에 떼어졌는지. 한 번 읽으면 소비된다. */
export function consumeRelease() {
  const r = releaseLatch;
  releaseLatch = false;
  return r;
}
