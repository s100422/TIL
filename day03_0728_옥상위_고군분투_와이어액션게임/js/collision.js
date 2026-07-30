// 지형과의 충돌 판정. 상태를 직접 바꾸지 않고 '무엇에 부딪혔는지'만 알려준다.

import { PLAYER_WIDTH, PLAYER_HEIGHT } from './player.js';
import { playerBottom } from './player.js';
import { TUNING } from './config.js';

/**
 * 이번 프레임에 착지한 지붕을 찾는다.
 *
 * 이전 프레임의 발바닥 위치(prevBottom)를 함께 보는 이유:
 * 발바닥이 지붕 표면을 '가로질러 통과한' 순간만 착지로 인정해야 한다.
 * 현재 위치만 보면 아래에서 위로 솟구쳐 지나갈 때도 지붕에 달라붙어 버린다.
 *
 * @param {object} player
 * @param {number} prevBottom 이전 프레임의 발바닥 y좌표
 * @param {Array<{x:number, y:number, width:number}>} platforms y는 지붕 표면(윗면)
 * @returns {object|null} 착지한 지붕 또는 null
 */
export function findLanding(player, prevBottom, platforms) {
  const bottom = playerBottom(player);
  const half = PLAYER_WIDTH / 2;

  for (const p of platforms) {
    // 수평 범위 밖이면 낭떠러지 구간 — 그냥 지나쳐 떨어진다
    if (player.x + half < p.x || player.x - half > p.x + p.width) continue;

    // 표면을 위에서 아래로 통과했는가
    if (prevBottom <= p.y && bottom >= p.y) return p;
  }

  return null;
}

/**
 * 지금 이 위치가 어떤 지붕 위에 발을 딛고 있는 상태인지.
 * 오토런 중 지붕 끝을 넘어서면(더 이상 어떤 지붕 범위에도 들지 않으면)
 * 걸어서 낭떠러지로 떨어지는 순간을 감지하는 데 쓴다.
 *
 * 수평 판정 기준을 findLanding()과 반드시 똑같이(몸통 절반너비만큼 여유를 두고) 맞춘다.
 * 기준이 다르면 두 함수가 "떨어졌다/아직 위다"를 서로 다르게 판단하는 구간이 생겨,
 * 지붕 끝에서 낙하와 재착지가 몇 프레임씩 번갈아 일어나는 깜빡임 버그가 난다.
 */
export function isOnPlatform(player, platforms) {
  const bottom = playerBottom(player);
  const half = PLAYER_WIDTH / 2;
  return platforms.some(
    (p) =>
      Math.abs(bottom - p.y) < 0.5 &&
      player.x + half >= p.x &&
      player.x - half <= p.x + p.width,
  );
}

/**
 * 낭떠러지로 떨어져 추락이 확정되었는지.
 * 캐릭터가 화면 아래로 완전히 사라지고 여유분만큼 더 내려간 뒤에 판정한다.
 *
 * @param {object} player
 * @param {number} screenHeight 논리 화면 높이
 */
export function hasFallen(player, screenHeight) {
  const top = player.y - PLAYER_HEIGHT / 2;
  return top > screenHeight + TUNING.FALL_DEATH_MARGIN;
}

/**
 * 목표 지점(G) 깃발에 닿았는지.
 *
 * 깃대 주변을 넉넉한 사각형으로 잡는다 — 착지해서 닿는 경우와 스윙으로
 * 지나가며 닿는 경우 모두 인정해야 하기 때문. 스치듯 지나갔는데 클리어가 안 되면
 * 플레이어는 판정이 이상하다고 느낀다.
 *
 * @param {object} player
 * @param {{x:number, y:number}} goal y는 깃대가 서 있는 지붕 표면
 */
export function reachedGoal(player, goal) {
  const left = goal.x - 30;
  const right = goal.x + 60;
  const top = goal.y - 90;
  const bottom = goal.y + 6;

  const halfW = PLAYER_WIDTH / 2;
  const halfH = PLAYER_HEIGHT / 2;

  return (
    player.x + halfW >= left &&
    player.x - halfW <= right &&
    player.y + halfH >= top &&
    player.y - halfH <= bottom
  );
}
