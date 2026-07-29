// 와이어(뚫어뻥) 발사, 진자 운동, 릴리즈 관성.

import { TUNING } from './config.js';

/**
 * 반직선과 원의 교차까지의 거리를 구한다.
 *
 * 원점 o, 단위방향 d, 원 중심 c, 반지름 r일 때 |o + t·d − c| = r 을 t에 대해 풀면
 *   t² + 2(m·d)t + (m·m − r²) = 0   (m = o − c)
 * 이 되고, 근의 공식으로 가장 가까운 양수 해를 찾는다.
 *
 * @returns {number|null} 교차까지의 거리, 교차하지 않으면 null
 */
function rayCircleDistance(ox, oy, dx, dy, cx, cy, r) {
  const mx = ox - cx;
  const my = oy - cy;
  const b = mx * dx + my * dy;
  const c = mx * mx + my * my - r * r;

  // 원점이 이미 원 안에 있으면 즉시 명중으로 본다
  if (c < 0) return 0;

  const disc = b * b - c;
  if (disc < 0) return null; // 스쳐 지나감

  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : null; // 음수면 원이 발사 방향 뒤쪽에 있다
}

/**
 * 조준 방향으로 와이어를 발사해 걸린 탑을 찾는다.
 * 여러 탑이 일직선에 겹쳐 있으면 가장 가까운 탑에 걸린다.
 *
 * @param {object} player
 * @param {number} aimX 커서 위치
 * @param {number} aimY
 * @param {Array} anchors
 * @returns {{anchor: object, length: number}|null} 부착 정보 또는 실패 시 null
 */
export function tryAttach(player, aimX, aimY, anchors) {
  const dx = aimX - player.x;
  const dy = aimY - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return null; // 커서가 캐릭터에 겹쳐 방향을 정할 수 없다

  // 조준선과 완전히 같은 단위벡터를 쓴다 — 화면에 보이는 선과 판정이 어긋나면 안 된다
  const ux = dx / dist;
  const uy = dy / dist;

  let best = null;
  for (const a of anchors) {
    const t = rayCircleDistance(player.x, player.y, ux, uy, a.x, a.y, TUNING.ANCHOR_RADIUS);
    if (t === null || t > TUNING.WIRE_MAX_LENGTH) continue;
    if (!best || t < best.t) best = { anchor: a, t };
  }

  if (!best) return null;

  // 와이어 길이는 교차 지점까지가 아니라 '회전축까지의 실제 거리'다.
  // 진자 운동의 반지름이 되어야 하므로 탑 중심 기준으로 계산한다.
  const length = Math.hypot(best.anchor.x - player.x, best.anchor.y - player.y);
  return { anchor: best.anchor, length, theta: 0, omega: 0 };
}

/**
 * 탑을 기준으로 한 현재 각도에서의 접선 방향 단위벡터.
 * theta가 커지는 쪽(반시계 방향이 아니라, y축이 아래인 화면 좌표계에서 시계 방향)을 가리킨다.
 */
function tangent(theta) {
  return { x: -Math.sin(theta), y: Math.cos(theta) };
}

/**
 * 진자 운동을 시작한다. 부착 직전의 속도를 각속도로 옮겨오는 것이 핵심이다.
 *
 * 빠르게 날아가던 중에 걸면 그만큼 빠르게 돌아야 한다. 단, 줄 방향(반지름 방향) 속도는
 * 줄이 버텨주므로 버리고 '접선 방향 성분'만 회전 속도로 살린다.
 */
export function startSwing(player, wire) {
  wire.theta = Math.atan2(player.y - wire.anchor.y, player.x - wire.anchor.x);

  const t = tangent(wire.theta);
  wire.omega = (player.vx * t.x + player.vy * t.y) / wire.length;
}

/**
 * 매 프레임 진자 운동을 갱신한다.
 *
 * 중력의 접선 성분만 회전을 가속시킨다:
 *   (0, g) · (−sinθ, cosθ) = g·cosθ  →  각가속도 α = g·cosθ / L
 * 화면 좌표계는 y가 아래쪽이라 theta = +90°(정확히 탑 아래)가 평형점이 되고,
 * 그 지점에서 cos(90°) = 0 이므로 가속이 0이 되어 안정적으로 매달린다.
 *
 * 여기서 쓰는 중력은 낙하용 GRAVITY가 아니라 SWING_GRAVITY_SCALE을 곱한 값이다.
 * 낙하 무게감과 스윙 경쾌함을 따로 조절하기 위한 의도적인 분리.
 */
export function updateSwing(player, wire, dt) {
  const swingGravity = TUNING.GRAVITY * TUNING.SWING_GRAVITY_SCALE;
  const alpha = (swingGravity * Math.cos(wire.theta)) / wire.length;
  wire.omega = (wire.omega + alpha * dt) * TUNING.SWING_DAMPING;
  wire.theta += wire.omega * dt;

  player.x = wire.anchor.x + Math.cos(wire.theta) * wire.length;
  player.y = wire.anchor.y + Math.sin(wire.theta) * wire.length;

  // 화면상 속도도 접선 방향으로 계속 맞춰둔다.
  // 이렇게 해두면 와이어를 놓는 순간 이 값이 그대로 관성이 되어 별도 변환이 필요없다.
  const t = tangent(wire.theta);
  const speed = wire.omega * wire.length;
  player.vx = t.x * speed;
  player.vy = t.y * speed;
}

/**
 * 와이어를 놓는다.
 *
 * updateSwing이 매 프레임 player.vx/vy를 접선 방향으로 맞춰뒀으므로,
 * 속도를 새로 계산할 필요 없이 이미 들어 있는 값이 그대로 관성이 된다.
 * 여기서는 손맛용 배율만 적용한다.
 */
export function releaseSwing(player) {
  player.vx *= TUNING.RELEASE_BOOST;
  player.vy *= TUNING.RELEASE_BOOST;
}
