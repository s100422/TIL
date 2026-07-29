// 개발용 튜닝 패널 (배포 전 제거).
//
// 손맛은 숫자를 보고 정할 수 없고 직접 만져봐야 알 수 있다.
// 이 패널로 값을 바꾸면 다시 불러오지 않고 바로 다음 스윙에 반영된다.
// 마음에 드는 조합을 찾았으면 '현재 값 복사' 버튼으로 값을 받아 config.js에 적어 넣으면 된다.

import { TUNING } from './config.js';

/** 슬라이더로 조절할 항목: [키, 최소, 최대, 증감폭, 설명] */
const CONTROLS = [
  ['SPEED_SCALE_PREVIEW', 1, 2, 0.05, '진행 속도 미리보기 (상위 단계 체감)'],
  ['SWING_GRAVITY_SCALE', 0.5, 4, 0.1, '스윙 속도 (클수록 경쾌)'],
  ['RELEASE_BOOST', 0.8, 2, 0.05, '놓을 때 튕김'],
  ['SWING_DAMPING', 0.97, 1, 0.002, '스윙 감쇠 (1=없음)'],
  ['GRAVITY', 600, 2600, 50, '중력 (낙하 무게감)'],
  ['JUMP_VELOCITY', -1100, -300, 10, '점프력 (음수)'],
  ['WIRE_MAX_LENGTH', 150, 500, 10, '와이어 사거리'],
  ['ANCHOR_RADIUS', 8, 40, 1, '탑 판정 반경'],
];

export function createTuningPanel() {
  const panel = document.createElement('div');
  panel.id = 'dev-tuning';

  const title = document.createElement('div');
  title.className = 'dev-title';
  title.textContent = '튜닝 패널 (개발용)';
  panel.appendChild(title);

  const readouts = [];

  for (const [key, min, max, step, label] of CONTROLS) {
    const row = document.createElement('label');
    row.className = 'dev-row';

    const name = document.createElement('span');
    name.className = 'dev-label';
    name.textContent = label;

    const value = document.createElement('span');
    value.className = 'dev-value';
    value.textContent = TUNING[key];

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = TUNING[key];
    slider.addEventListener('input', () => {
      TUNING[key] = parseFloat(slider.value);
      value.textContent = TUNING[key];
    });

    row.append(name, value, slider);
    panel.appendChild(row);
    readouts.push({ key, slider, value });
  }

  const buttons = document.createElement('div');
  buttons.className = 'dev-buttons';

  const copyBtn = document.createElement('button');
  copyBtn.textContent = '현재 값 복사';
  copyBtn.addEventListener('click', () => {
    const text = CONTROLS.map(([k]) => `  ${k}: ${TUNING[k]},`).join('\n');
    navigator.clipboard?.writeText(text);
    copyBtn.textContent = '복사됨!';
    setTimeout(() => (copyBtn.textContent = '현재 값 복사'), 1200);
  });

  const resetBtn = document.createElement('button');
  resetBtn.textContent = '되돌리기';
  const defaults = Object.fromEntries(CONTROLS.map(([k]) => [k, TUNING[k]]));
  resetBtn.addEventListener('click', () => {
    for (const { key, slider, value } of readouts) {
      TUNING[key] = defaults[key];
      slider.value = defaults[key];
      value.textContent = defaults[key];
    }
  });

  buttons.append(copyBtn, resetBtn);
  panel.appendChild(buttons);

  document.body.appendChild(panel);
}
