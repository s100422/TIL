// 플레이어(고군) 상태와 물리 데이터.
// 그리기는 renderer.js가, 와이어 관련 물리는 wire.js가 담당한다.

import { TUNING } from './config.js';

/** 플레이어 상태 머신의 세 가지 상태. */
export const PlayerState = {
  GROUND: 'GROUND',       // 지붕 위. 클릭 시 고정 점프
  AIR_FREE: 'AIR_FREE',   // 공중 자유 낙하/관성 비행. 클릭 시 와이어 발사
  AIR_WIRED: 'AIR_WIRED', // 와이어로 앵커에 매달려 원운동 중
};

// 캐릭터 크기 (논리 해상도 960x540 기준). 충돌 판정 크기이기도 하다.
export const PLAYER_WIDTH = 26;
export const PLAYER_HEIGHT = 34;

/**
 * 플레이어를 생성한다.
 * x, y는 캐릭터의 '중심' 좌표 — 진자 운동 시 앵커와의 반지름 계산이 중심 기준이라 일관성을 위함.
 */
export function createPlayer(x, y) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    state: PlayerState.GROUND,
    facing: 1, // 1 = 오른쪽, -1 = 왼쪽
  };
}

/** 캐릭터 발바닥의 y좌표. 착지 판정에 쓴다. */
export function playerBottom(player) {
  return player.y + PLAYER_HEIGHT / 2;
}

/**
 * 중력을 적용하고 위치를 갱신한다. AIR_FREE 상태에서만 호출한다.
 * (AIR_WIRED는 원운동 공식으로 위치가 결정되므로 중력을 직접 더하지 않는다)
 */
export function updateAirFree(player, dt) {
  player.vy = Math.min(player.vy + TUNING.GRAVITY * dt, TUNING.MAX_FALL_SPEED);
  player.x += player.vx * dt;
  player.y += player.vy * dt;
}

/**
 * 지상 점프. 항상 같은 초기 속도를 주는 '고정 구조 점프'이므로
 * 플레이어는 높이를 조절할 수 없고 타이밍만 판단하면 된다.
 * 가로 속도(오토런)는 건드리지 않는다 — 세로로만 튀어오르는 포물선이 된다.
 */
export function jump(player) {
  player.vy = TUNING.JUMP_VELOCITY;
  player.state = PlayerState.AIR_FREE;
}

/**
 * 지상에서의 오토런. 캐릭터는 항상 같은 속도로 전진하고,
 * 플레이어는 그 속도를 늦추거나 멈출 수 없다 — 타이밍만 조절한다.
 *
 * 속도를 인자로 받는 이유: 스테이지마다 진행 속도가 달라지는데(CP20),
 * player.js가 '지금 몇 단계인지'를 알아야 하는 구조가 되면 안 된다.
 *
 * @param {number} runSpeed 이 스테이지의 오토런 속도 (px/s)
 */
export function updateGround(player, dt, runSpeed) {
  player.vx = runSpeed;
  player.x += player.vx * dt;
}

/**
 * 지붕에 착지시킨다. 발바닥을 지붕 표면에 딱 맞추고 낙하 속도를 없앤다.
 *
 * 가로 속도도 오토런 속도로 되돌린다 — 스윙으로 얻은 관성을 착지 후까지
 * 끌고 가면 같은 스테이지 안에서도 속도가 들쭉날쭉해져 난이도를 예측할 수 없게 된다.
 *
 * @param {number} runSpeed 이 스테이지의 오토런 속도 (px/s)
 */
export function landOn(player, surfaceY, runSpeed) {
  player.y = surfaceY - PLAYER_HEIGHT / 2;
  player.vx = runSpeed;
  player.vy = 0;
  player.state = PlayerState.GROUND;
}
