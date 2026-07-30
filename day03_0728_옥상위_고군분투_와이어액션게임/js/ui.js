// 화면 UI(팝업, 타이틀, 버튼)를 담당한다.
//
// renderer.js는 '게임 세계'를, ui.js는 '화면 위에 얹히는 것'을 그린다.
// 버튼을 DOM이 아니라 캔버스에 그리는 이유: input.js가 이미 마우스 좌표를
// 논리 좌표계(960x540)로 변환해주므로, 캔버스가 확대/축소되어도 버튼 판정이 그대로 맞는다.
// DOM 버튼이면 스케일링에 맞춰 위치를 따로 계산해야 한다.

import { ctx, GAME_WIDTH, GAME_HEIGHT } from './canvas.js';

const CENTER_X = GAME_WIDTH / 2;
const DISPLAY_FONT = '"Arial Black", "Malgun Gothic", sans-serif';
const UI_FONT = '"Trebuchet MS", "Malgun Gothic", sans-serif';

function roundedRect(x, y, w, h, radius = 10) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 재시도 확인 팝업의 버튼들 (논리 좌표) */
export const RETRY_BUTTONS = {
  retry: { x: CENTER_X - 155, y: 290, w: 140, h: 46, label: '재시도' },
  quit: { x: CENTER_X + 15, y: 290, w: 140, h: 46, label: '그만두기' },
};

/** 타이틀 화면의 버튼들 */
export const TITLE_BUTTONS = {
  start: { x: CENTER_X - 95, y: 372, w: 190, h: 52, label: '게임 시작' },
};

/**
 * 스테이지 클리어 화면의 버튼.
 * 라벨은 마지막 스테이지인지에 따라 달라지므로 그릴 때 결정한다.
 */
export const CLEAR_BUTTONS = {
  next: { x: CENTER_X - 100, y: 306, w: 200, h: 46, label: '' },
};

/** 점이 버튼 안에 있는지. */
export function containsPoint(btn, x, y) {
  return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
}

/**
 * 커서 아래에 있는 버튼의 키를 반환한다.
 * @param {object} buttons {키: 버튼} 형태
 * @returns {string|null}
 */
export function buttonAt(buttons, x, y) {
  for (const [key, btn] of Object.entries(buttons)) {
    if (containsPoint(btn, x, y)) return key;
  }
  return null;
}

function drawButton(btn, hovered, accent) {
  ctx.save();
  ctx.shadowColor = accent.border;
  ctx.shadowBlur = hovered ? 18 : 8;
  ctx.fillStyle = hovered ? accent.hover : accent.base;
  roundedRect(btn.x, btn.y, btn.w, btn.h, 10);
  ctx.fill();

  ctx.strokeStyle = accent.border;
  ctx.lineWidth = 2;
  roundedRect(btn.x, btn.y, btn.w, btn.h, 10);
  ctx.stroke();

  ctx.fillStyle = hovered ? '#ffffff' : '#e6f0fa';
  ctx.font = `800 17px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.restore();
}

/**
 * 추락 후 "재시도?" 확인 팝업.
 * @param {{x:number,y:number}} mouse 커서 위치 (호버 표시용)
 */
export function drawRetryPopup(mouse) {
  // 게임 화면을 어둡게 덮어 조작이 멈췄음을 알린다
  ctx.fillStyle = 'rgba(6, 9, 18, 0.78)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // 패널
  const px = CENTER_X - 190;
  const py = 170;
  const retryPanel = ctx.createLinearGradient(px, py, px, py + 200);
  retryPanel.addColorStop(0, 'rgba(105, 32, 87, 0.98)');
  retryPanel.addColorStop(1, 'rgba(22, 28, 62, 0.98)');
  ctx.fillStyle = retryPanel;
  roundedRect(px, py, 380, 200, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 184, 107, 0.85)';
  ctx.lineWidth = 2;
  roundedRect(px, py, 380, 200, 18);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff7a6a';
  ctx.font = `900 34px ${DISPLAY_FONT}`;
  ctx.fillText('추락!', CENTER_X, py + 62);

  ctx.fillStyle = 'rgba(224, 236, 248, 0.9)';
  ctx.font = `600 17px ${UI_FONT}`;
  ctx.fillText('다시 시도할까?', CENTER_X, py + 98);
  ctx.textAlign = 'left';

  const hovered = buttonAt(RETRY_BUTTONS, mouse.x, mouse.y);
  drawButton(RETRY_BUTTONS.retry, hovered === 'retry', {
    base: 'rgba(124, 255, 155, 0.16)',
    hover: 'rgba(124, 255, 155, 0.34)',
    border: 'rgba(124, 255, 155, 0.7)',
  });
  drawButton(RETRY_BUTTONS.quit, hovered === 'quit', {
    base: 'rgba(255, 122, 106, 0.14)',
    hover: 'rgba(255, 122, 106, 0.3)',
    border: 'rgba(255, 122, 106, 0.6)',
  });
}

/**
 * 코스 완주 화면. 스테이지가 하나로 이어진 뒤로는 '완주'가 곧 게임 전체의 끝이라
 * 항상 이 화면 하나만 존재한다 (중간 스테이지 클리어 팝업 없음).
 * @param {{x:number,y:number}} mouse 커서 위치
 * @param {{score:number, coinsTaken:number, coinsTotal:number, perfectGroups:number, totalGroups:number}} info
 */
export function drawClearPopup(mouse, info) {
  ctx.fillStyle = 'rgba(6, 14, 12, 0.78)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const px = CENTER_X - 200;
  const py = 160;
  const clearPanel = ctx.createLinearGradient(px, py, px, py + 204);
  clearPanel.addColorStop(0, 'rgba(18, 98, 101, 0.98)');
  clearPanel.addColorStop(1, 'rgba(48, 22, 73, 0.98)');
  ctx.fillStyle = clearPanel;
  roundedRect(px, py, 400, 204, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(130, 255, 217, 0.82)';
  ctx.lineWidth = 2;
  roundedRect(px, py, 400, 204, 18);
  ctx.stroke();

  ctx.textAlign = 'center';

  ctx.fillStyle = '#7cff9b';
  ctx.font = `900 32px ${DISPLAY_FONT}`;
  ctx.fillText('전체 클리어!', CENTER_X, py + 58);

  ctx.fillStyle = '#ffd24a';
  ctx.font = `900 22px ${DISPLAY_FONT}`;
  ctx.fillText(`${info.score}점`, CENTER_X, py + 100);

  ctx.fillStyle = 'rgba(224, 244, 236, 0.7)';
  ctx.font = '14px "Malgun Gothic", sans-serif';
  ctx.fillText(
    `동전 ${info.coinsTaken}/${info.coinsTotal}   구간 퍼펙트 ${info.perfectGroups}/${info.totalGroups}`,
    CENTER_X,
    py + 126,
  );

  ctx.textAlign = 'left';

  CLEAR_BUTTONS.next.label = '타이틀로';
  const hovered = buttonAt(CLEAR_BUTTONS, mouse.x, mouse.y);
  drawButton(CLEAR_BUTTONS.next, hovered === 'next', {
    base: 'rgba(124, 255, 155, 0.16)',
    hover: 'rgba(124, 255, 155, 0.34)',
    border: 'rgba(124, 255, 155, 0.7)',
  });
}

/** HUD 상단 바의 높이. 다른 화면 요소(디버그 텍스트 등)가 이 아래부터 그려지도록 기준으로 쓴다. */
export const HUD_HEIGHT = 54;

/**
 * 플레이 중 항상 떠 있는 HUD — 점수, 동전 진행도, 코스 진행률.
 * 화면 맨 위에 얇은 바 형태로 둔다 — 게임 세계(카메라 스크롤)와 무관하게
 * 항상 같은 자리에 있어야 하는 정보라, main.js에서 translate 밖(화면 좌표)에 그린다.
 *
 * @param {{score:number, coinsTaken:number, coinsTotal:number, progress:number}} info
 *          progress는 0~1 — 코스 전체 길이 대비 지금까지 달려온 비율.
 */
export function drawHUD(info) {
  ctx.save();

  const hud = ctx.createLinearGradient(0, 0, GAME_WIDTH, 0);
  hud.addColorStop(0, 'rgba(50, 17, 76, 0.92)');
  hud.addColorStop(0.5, 'rgba(112, 35, 92, 0.86)');
  hud.addColorStop(1, 'rgba(11, 67, 83, 0.92)');
  ctx.fillStyle = hud;
  ctx.fillRect(0, 0, GAME_WIDTH, HUD_HEIGHT);
  ctx.fillStyle = '#ffb86b';
  ctx.fillRect(0, HUD_HEIGHT - 3, GAME_WIDTH, 3);
  ctx.fillStyle = 'rgba(85, 255, 214, 0.88)';
  ctx.fillRect(0, HUD_HEIGHT - 1, GAME_WIDTH, 1);

  // 점수 — 왼쪽. 라벨은 작게, 값은 크게 두어 한눈에 값이 먼저 들어오게 한다.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd36b';
  ctx.font = `800 10px ${DISPLAY_FONT}`;
  ctx.fillText('SCORE', 18, 16);
  ctx.fillStyle = '#fff2b0';
  ctx.font = `800 23px ${DISPLAY_FONT}`;
  ctx.fillText(`${String(info.score).padStart(5, '0')}`, 17, 40);

  // 동전 진행도 — 가운데. 작은 동전 아이콘으로 무엇을 세는 값인지 바로 알 수 있게 한다.
  const coinX = CENTER_X - 46;
  ctx.beginPath();
  ctx.arc(coinX, 26, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd24a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(150, 100, 20, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.arc(coinX - 2, 24, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e6f0fa';
  ctx.font = `800 16px ${DISPLAY_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`${info.coinsTaken} / ${info.coinsTotal}`, coinX + 15, 31);

  // 코스 진행도 — 오른쪽. 스테이지가 하나로 이어진 뒤로는 '몇 단계인지'보다
  // '전체 중 얼마나 왔는지'가 더 의미 있는 정보라 퍼센트 + 진행 바로 보여준다.
  const barW = 130;
  const barX = GAME_WIDTH - 18 - barW;

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(167, 255, 232, 0.85)';
  ctx.font = `800 10px ${DISPLAY_FONT}`;
  ctx.fillText('ROOFTOP RUN', GAME_WIDTH - 18, 16);
  ctx.fillStyle = '#a7ffe8';
  ctx.font = `800 15px ${DISPLAY_FONT}`;
  ctx.fillText(`${Math.round(info.progress * 100)}%`, GAME_WIDTH - 18, 32);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fillRect(barX, 39, barW, 7);
  ctx.fillStyle = '#62f6d4';
  ctx.fillRect(barX, 39, barW * info.progress, 7);
  ctx.strokeStyle = 'rgba(167, 255, 232, 0.72)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, 39, barW, 7);

  ctx.restore();
  ctx.textAlign = 'left';
}

/**
 * 타이틀 화면.
 *
 * 배경은 main.js가 게임 세계를 그려준 위에 얹는다 — 단색 화면보다
 * '이런 게임이구나'가 바로 전해지고, 배경용 리소스를 따로 만들 필요도 없다.
 *
 * @param {{x:number,y:number}} mouse 커서 위치 (호버 표시용)
 */
export function drawTitleScreen(mouse) {
  // 위쪽은 진하게, 아래쪽은 옅게 — 글자는 잘 읽히고 게임 화면은 남는다
  const veil = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  veil.addColorStop(0, 'rgba(6, 9, 20, 0.9)');
  veil.addColorStop(1, 'rgba(6, 9, 20, 0.55)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.textAlign = 'center';

  ctx.shadowColor = 'rgba(255, 129, 121, 0.8)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffe19a';
  ctx.font = `900 46px ${DISPLAY_FONT}`;
  ctx.fillText('옥상 위 고군분투!', CENTER_X, 160);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(151, 255, 229, 0.92)';
  ctx.font = `700 18px ${UI_FONT}`;
  ctx.fillText('마우스 하나로 하는 와이어 액션', CENTER_X, 196);

  // 조작법 — 원버튼 게임이라 세 줄로 설명이 끝난다
  const guides = [
    ['지상에서 클릭', '점프'],
    ['공중에서 클릭', '와이어 발사 → 누른 채 스윙'],
    ['버튼을 떼면', '관성으로 튕겨나감'],
  ];
  ctx.font = `600 16px ${UI_FONT}`;
  guides.forEach(([action, result], i) => {
    const y = 258 + i * 30;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 224, 102, 0.9)';
    ctx.fillText(action, CENTER_X - 14, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(214, 230, 245, 0.75)';
    ctx.fillText(`→  ${result}`, CENTER_X + 14, y);
  });

  ctx.textAlign = 'left';

  const hovered = buttonAt(TITLE_BUTTONS, mouse.x, mouse.y);
  drawButton(TITLE_BUTTONS.start, hovered === 'start', {
    base: 'rgba(232, 81, 105, 0.68)',
    hover: 'rgba(245, 108, 111, 0.92)',
    border: 'rgba(255, 225, 151, 0.95)',
  });
}
