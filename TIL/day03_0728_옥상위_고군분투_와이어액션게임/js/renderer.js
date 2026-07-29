// 모든 드로잉을 담당. 게임 상태를 읽어서 그리기만 하고, 상태를 바꾸지 않는다.

import { ctx, GAME_WIDTH, GAME_HEIGHT } from './canvas.js';
import { PLAYER_WIDTH, PLAYER_HEIGHT } from './player.js';
import { TUNING } from './config.js';
import { COIN_RADIUS } from './coin.js';

// 배경 별자리 — 고정된 목록이라야 프레임마다 위치가 안 흔들린다. 반짝임만 시간에 따라 변한다.
const STARS = Array.from({ length: 56 }, (_, i) => ({
  x: (i * 137 + 40) % GAME_WIDTH,
  y: (i * 71 + 20) % 274,
  phase: i * 1.7,
  speed: 1.2 + (i % 5) * 0.3,
}));

/**
 * 배경 스카이라인 한 '칸'의 건물 배치. 이 칸을 옆으로 반복 배치해서
 * 코스가 아무리 길어도(1만px 이상) 유한한 데이터로 스카이라인을 채운다.
 * 실루엣만 보이면 되므로 그림자처럼 단순한 사각형으로 충분하다.
 */
const SKYLINE_UNIT = 520;
const SKYLINE_BUILDINGS = [
  { x: 10, w: 70, h: 100 },
  { x: 95, w: 46, h: 165 },
  { x: 160, w: 85, h: 80 },
  { x: 260, w: 55, h: 140 },
  { x: 330, w: 100, h: 105 },
  { x: 440, w: 60, h: 190 },
];
const SKYLINE_BASE_Y = 440; // 스카이라인이 서 있는 가상의 지평선. 실제 옥상(ROOF_Y=440)과 같은
// 높이로 맞춰서, 배경 건물 밑단이 전경 지붕/낭떠러지 경계선과 바로 이어지게 한다(빈 하늘 틈 없이).

/**
 * 남산타워 + 언덕. 카메라 위치와 무관하게 화면 고정 위치에 그리는 랜드마크다 —
 * 사용자 요청("남산타워는 꼭 보이고")대로 코스 어디에 있든 항상 같은 자리에 떠 있다.
 * 달이 그 뒤에서 크게 떠 있어서, 타워 실루엣이 달을 배경으로 도드라진다.
 */
function drawNamsanLandmark() {
  const cx = 350;
  const hillBaseY = 440; // 배경 스카이라인과 같은 지평선 — 언덕 밑단도 옥상 높이까지 내려서 붙인다.

  // 언덕 — 완만한 곡선 실루엣
  ctx.fillStyle = '#17315a';
  ctx.beginPath();
  ctx.moveTo(190, hillBaseY);
  ctx.quadraticCurveTo(260, 268, cx, 262);
  ctx.quadraticCurveTo(440, 268, 510, hillBaseY);
  ctx.closePath();
  ctx.fill();

  // 타워 몸통 — 아래는 두껍고 위로 갈수록 가늘어지는 마스트
  ctx.beginPath();
  ctx.moveTo(cx - 7, 262);
  ctx.lineTo(cx - 3, 118);
  ctx.lineTo(cx + 3, 118);
  ctx.lineTo(cx + 7, 262);
  ctx.closePath();
  ctx.fill();

  // 전망대 — 마스트 중간의 볼록한 부분 (남산타워를 한눈에 알아보게 하는 특징)
  ctx.beginPath();
  ctx.ellipse(cx, 168, 15, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // 안테나 — 맨 꼭대기의 가는 침 3개
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#17315a';
  ctx.beginPath();
  ctx.moveTo(cx, 118);
  ctx.lineTo(cx, 78);
  ctx.moveTo(cx - 4, 118);
  ctx.lineTo(cx - 7, 88);
  ctx.moveTo(cx + 4, 118);
  ctx.lineTo(cx + 7, 88);
  ctx.stroke();
}

/**
 * 밤하늘 배경 — 서울 야경을 단순한 그림자 실루엣으로 표현.
 * 달/별은 반짝이는 애니메이션이 있고, 스카이라인은 카메라보다 느리게 움직이는
 * 시차(패럴랙스)를 줘서 멀리 있는 도시처럼 보이게 한다. 남산타워는 패럴랙스 없이
 * 화면에 고정된 랜드마크로 항상 보인다.
 *
 * @param {number} time 누적 경과 시간(초) — 별 반짝임에 쓴다.
 * @param {number} cameraX 현재 카메라 x — 스카이라인 시차 계산에 쓴다.
 */
export function drawBackground(time = 0, cameraX = 0) {
  const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  sky.addColorStop(0, '#35116b');
  sky.addColorStop(0.38, '#682778');
  sky.addColorStop(0.72, '#147c91');
  sky.addColorStop(1, '#11b09b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // 달 — 남산타워 뒤에 크게 떠서 실루엣이 도드라지게 한다
  ctx.fillStyle = 'rgba(255, 218, 195, 0.65)';
  ctx.beginPath();
  ctx.arc(350, 165, 58, 0, Math.PI * 2);
  ctx.fill();

  // 별 — 각자 다른 속도로 은은하게 반짝인다
  for (const s of STARS) {
    const twinkle = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase));
    ctx.fillStyle = `rgba(220, 232, 250, ${twinkle.toFixed(2)})`;
    const size = s.phase % 3 < 1 ? 2 : 1;
    ctx.fillRect(s.x, s.y, size, size);
  }

  drawNamsanLandmark();

  // 스카이라인 — 카메라의 1/4 속도로만 흘러가는 패럴랙스. 건물 하나하나를 다 만들지 않고
  // SKYLINE_UNIT 폭짜리 칸을 좌우로 반복해서, 코스가 아무리 길어도 유한한 데이터로 채운다.
  const parallaxX = cameraX * 0.25;
  const startUnit = Math.floor(parallaxX / SKYLINE_UNIT) - 1;
  const endUnit = Math.floor((parallaxX + GAME_WIDTH) / SKYLINE_UNIT) + 1;

  // 멀리 있는 청록 도시: 카메라보다 느리게 움직여 깊이를 만든다.
  ctx.fillStyle = 'rgba(16, 74, 98, 0.72)';
  ctx.fillRect(0, 382, GAME_WIDTH, 58);
  ctx.fillStyle = '#12345d';
  for (let u = startUnit; u <= endUnit; u++) {
    const unitScreenX = u * SKYLINE_UNIT - parallaxX;
    for (const b of SKYLINE_BUILDINGS) {
      const bx = unitScreenX + b.x;
      if (bx + b.w < 0 || bx > GAME_WIDTH) continue; // 화면 밖이면 그릴 필요 없다
      ctx.fillRect(bx, SKYLINE_BASE_Y - b.h, b.w, b.h);
      ctx.fillStyle = '#1b4f75';
      ctx.fillRect(bx + 4, SKYLINE_BASE_Y - b.h + 4, Math.max(2, b.w - 8), 5);

      // 창문 몇 개 — building을 실루엣만이 아니라 '도시' 느낌 나게 하는 최소한의 디테일
      ctx.fillStyle = 'rgba(255, 209, 102, 0.78)';
      const rows = Math.floor(b.h / 26);
      const cols = Math.max(1, Math.floor(b.w / 22));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // 창문 일부만 켜져 있어야 자연스럽다 (다 켜지면 격자무늬로만 보임)
          if ((r * 7 + c * 3 + u) % 4 !== 0) continue;
          ctx.fillRect(bx + 8 + c * 22, SKYLINE_BASE_Y - b.h + 12 + r * 26, 6, 8);
        }
      }
      ctx.fillStyle = '#12345d';
    }
  }

  const cityGlow = ctx.createLinearGradient(0, 356, 0, 440);
  cityGlow.addColorStop(0, 'rgba(64, 231, 200, 0)');
  cityGlow.addColorStop(1, 'rgba(31, 212, 181, 0.23)');
  ctx.fillStyle = cityGlow;
  ctx.fillRect(0, 356, GAME_WIDTH, 84);
}

/**
 * 낭떠러지(지붕 아래의 심연).
 * 지붕보다 먼저 그린다 — 지붕이 없는 구간이 그대로 어두운 낭떠러지로 드러난다.
 * 배경 하늘색이 아래까지 이어지면 '떨어지면 죽는 곳'으로 읽히지 않는다.
 */
export function drawAbyss(top) {
  const depth = ctx.createLinearGradient(0, top, 0, GAME_HEIGHT);
  depth.addColorStop(0, '#07333b');
  depth.addColorStop(0.36, '#082035');
  depth.addColorStop(1, '#030714');
  ctx.fillStyle = depth;
  ctx.fillRect(0, top, GAME_WIDTH, GAME_HEIGHT - top);
  ctx.fillStyle = 'rgba(48, 226, 187, 0.1)';
  ctx.fillRect(0, top + 16, GAME_WIDTH, 2);
  ctx.fillStyle = 'rgba(4, 10, 24, 0.45)';
  for (let x = -20; x < GAME_WIDTH + 30; x += 64) {
    const h = 38 + ((x * 13) % 44 + 44) % 44;
    ctx.fillRect(x, GAME_HEIGHT - h, 38, h);
    ctx.fillStyle = 'rgba(77, 229, 191, 0.16)';
    ctx.fillRect(x + 9, GAME_HEIGHT - h + 12, 4, 9);
    ctx.fillStyle = 'rgba(4, 10, 24, 0.45)';
  }
}

/**
 * 창문 하나. 유리(파랑) + 흰 십자 프레임으로 4분할된 플랫 스타일 창문.
 * 배경 스카이라인의 '켜진 창문 점 하나'와 달리, 여기는 눈앞의 건물이라 창틀까지 그린다.
 */
function drawFlatWindow(x, y, w, h, lit) {
  ctx.fillStyle = '#4a1644';
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  const glass = ctx.createLinearGradient(x, y, x, y + h);
  glass.addColorStop(0, lit ? '#ffe582' : '#2aa9a2');
  glass.addColorStop(1, lit ? '#f08a50' : '#176a7e');
  ctx.fillStyle = glass;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = lit ? '#fff0af' : '#75dfd2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
}

/**
 * 건물 옥상(플랫폼)들을 그린다. p.y는 캐릭터가 올라서는 표면(옥상 바닥)이다.
 * 컨셉이 '옥상 위 고군분투'라, 기와지붕 대신 도시 건물 옥상으로 표현한다.
 *
 * 배경 스카이라인은 밤하늘의 어두운 실루엣이지만, 실제로 뛰어다니는 이 건물만큼은
 * 또렷하게 보여야 하므로(어디를 밟을 수 있는지가 곧 게임 판정이다) 밝은 플랫 컬러로 그린다 —
 * 살구색 벽면 + 파란 창문 + 크림색 옥상 테두리로, 채도 낮은 밤하늘 배경과 대비를 이룬다.
 */
export function drawPlatforms(platforms) {
  for (const p of platforms) {
    // 건물 몸체 — 위쪽은 살구색이지만 아래로 갈수록 낭떠러지(drawAbyss)와 같은 어둠으로
    // 가라앉는다. 건물이 화면 바닥에서 뚝 잘려 '공중에 뜬 블록'처럼 보이는 것을 막고,
    // 실제로는 훨씬 아래(화면 밖)까지 이어진 건물이라는 인상을 준다.
    const bodyTop = p.y + 13;
    const body = ctx.createLinearGradient(0, bodyTop, 0, GAME_HEIGHT);
    body.addColorStop(0, '#c83d62');
    body.addColorStop(0.42, '#9f2b55');
    body.addColorStop(0.78, '#4d1d48');
    body.addColorStop(1, '#04060c'); // drawAbyss()의 맨 아래 색과 동일 — 경계가 안 보이게
    ctx.fillStyle = body;
    ctx.fillRect(p.x, bodyTop, p.width, GAME_HEIGHT - bodyTop);

    // 창문 한 줄 — 일정 간격으로 반복
    ctx.fillStyle = 'rgba(255, 178, 130, 0.2)';
    for (let by = p.y + 20; by < GAME_HEIGHT - 32; by += 20) {
      ctx.fillRect(p.x, by, p.width, 1);
    }
    for (let wx = p.x + 18; wx + 24 < p.x + p.width - 10; wx += 48) {
      const lit = Math.floor(wx / 48 + p.x / 21) % 3 !== 0;
      drawFlatWindow(wx, p.y + 30, 23, 29, lit);
    }

    // 옥상 테두리 — 크림색 콘크리트 턱. 착지 지점을 눈으로 명확히 알 수 있게 한다.
    ctx.fillStyle = '#5c1b45';
    ctx.fillRect(p.x, p.y - 8, p.width, 10);
    ctx.fillStyle = '#ed6b68';
    ctx.fillRect(p.x, p.y - 3, p.width, 11);
    ctx.fillStyle = '#ffb07b';
    ctx.fillRect(p.x, p.y + 6, p.width, 5);
    ctx.fillStyle = '#7f224b';
    for (let tx = p.x - 6; tx < p.x + p.width + 8; tx += 18) {
      ctx.beginPath();
      ctx.arc(tx, p.y + 5, 8, Math.PI, 0);
      ctx.fill();
    }
    ctx.fillStyle = '#ffe1a4';
    ctx.fillRect(p.x, p.y + 10, p.width, 3);

    // 옥상 위 작은 설비함 — 폭이 넉넉한 지붕에만 하나씩 놓아 단조로움을 줄인다
    if (p.width >= 220) {
      const boxX = p.x + p.width * 0.32;
      ctx.fillStyle = '#401c46';
      ctx.fillRect(boxX - 22, p.y - 18, 44, 18);
      ctx.fillStyle = '#5ecfbe';
      ctx.fillRect(boxX - 16, p.y - 13, 32, 4);
    }

    // 절벽(옥상 끝) 모서리 — 안전-경고 줄무늬로 어디서 옥상이 끊기는지 한눈에 보이게 한다
    const stripe = 8;
    for (let sy = p.y; sy < p.y + 24; sy += stripe) {
      ctx.fillStyle = ((sy - p.y) / stripe) % 2 === 0 ? '#ffb24f' : '#551c46';
      ctx.fillRect(p.x, sy, 4, stripe);
      ctx.fillRect(p.x + p.width - 4, sy, 4, stripe);
    }
  }
}

/**
 * 전봇대(앵커)들을 그린다. a.x, a.y는 와이어가 걸리는 고리(가로대 중심)의 위치다.
 */
export function drawAnchors(anchors, rangeFrom = null, lockedAnchor = null) {
  for (const a of anchors) {
    // 사거리 안에 있는 전봇대는 테두리를 밝게 — 연속 스윙에서 다음 목표를 찾기 위한 표시
    const inRange =
      rangeFrom &&
      Math.hypot(a.x - rangeFrom.x, a.y - rangeFrom.y) <= TUNING.WIRE_MAX_LENGTH;

    // 전봇대 몸통 — 고리 아래로 화면 맨 밑까지 쭉 뻗는다. a.height까지만 그리고 끊으면
    // 낭떠러지 한가운데 짧은 기둥이 공중에 떠 있는 것처럼 보인다 — 실제로는 훨씬 아래
    // (화면 밖) 어딘가에 박혀 있는 전봇대라는 인상을 주려고 바닥까지 이어서 그린다.
    const poleGrad = ctx.createLinearGradient(0, a.y, 0, GAME_HEIGHT);
    poleGrad.addColorStop(0, '#f16c63');
    poleGrad.addColorStop(0.3, '#a82f58');
    poleGrad.addColorStop(0.78, '#301a45');
    poleGrad.addColorStop(1, '#04060c'); // drawAbyss()의 맨 아래 색과 동일
    ctx.fillStyle = poleGrad;
    ctx.fillRect(a.x - 6, a.y, 12, GAME_HEIGHT - a.y);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(a.x + 1, a.y, 3, GAME_HEIGHT - a.y); // 음영 한 줄로 원통 느낌

    // 가로대(완목) — 와이어가 실제로 걸리는 고리가 이 위에 얹혀 있는 것처럼 보이게 한다
    ctx.strokeStyle = '#461a48';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(a.x - 27, a.y - 3);
    ctx.lineTo(a.x + 27, a.y - 3);
    ctx.stroke();

    // 애자(碍子) — 가로대 양 끝의 흰 사기 절연체
    ctx.fillStyle = '#77f3d1';
    ctx.beginPath();
    ctx.arc(a.x - 24, a.y - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(a.x + 24, a.y - 3, 4, 0, Math.PI * 2);
    ctx.fill();

    // 처진 전깃줄 한 가닥 — 장식용, 판정에는 영향 없다
    ctx.strokeStyle = 'rgba(38, 16, 57, 0.72)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(a.x - 24, a.y - 1);
    ctx.quadraticCurveTo(a.x, a.y + 12, a.x + 24, a.y - 1);
    ctx.stroke();

    // 부착 판정 반경 — 어디까지가 '걸리는 범위'인지 보이게 한다
    if (a === lockedAnchor) {
      // 지금 조준하면 걸리는 전봇대 — 초록으로 확실히 구분
      ctx.strokeStyle = '#fff09b';
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = inRange
        ? 'rgba(90, 252, 210, 0.96)'
        : 'rgba(90, 252, 210, 0.38)';
      ctx.lineWidth = 2;
    }
    ctx.beginPath();
    ctx.arc(a.x, a.y, TUNING.ANCHOR_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // 고리 중심 = 진자 운동의 회전축
    ctx.fillStyle = a === lockedAnchor ? '#fff09b' : '#5afcd2';
    ctx.beginPath();
    ctx.arc(a.x, a.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 캐릭터를 도형 placeholder로 그린다. (CP23에서 최종 비주얼로 교체 예정)
 * player.x, player.y는 중심 좌표다.
 */
export function drawPlayer(player) {
  const left = player.x - PLAYER_WIDTH / 2;
  const top = player.y - PLAYER_HEIGHT / 2;
  const bottom = top + PLAYER_HEIGHT;
  const legTop = top + 22;

  // 다리 — 지상에서는 '이동 거리'에 비례해 흔들려서 속도와 무관하게 자연스러운 걸음이 되고,
  // 공중에서는 액션 포즈로 고정한다(시간 기반이 아니라 x 기반인 이유: dt에 흔들리지 않는다).
  const onGround = player.state === 'GROUND';
  const stride = onGround ? Math.sin(player.x * 0.045) * 5 : player.facing * 4;
  ctx.fillStyle = '#2d183d';
  ctx.fillRect(player.x - 6 + stride, legTop, 5, bottom - legTop);
  ctx.fillRect(player.x + 1 - stride, legTop, 5, bottom - legTop);

  // 등 뒤 가방 — 와이어(뚫어뻥)가 여기서 발사된다는 설정을 보여주는 장치.
  // 바라보는 방향의 반대쪽(등 쪽)에 그린다.
  // 등 뒤의 주황색 뚫어뻥 가방은 캐릭터의 실루엣만 봐도 와이어 액션임을 알려준다.
  ctx.fillStyle = '#ffad4b';
  ctx.fillRect(player.x - player.facing * 11 - 4, top + 12, 8, 12);
  ctx.fillStyle = '#6e2549';
  ctx.fillRect(player.x - player.facing * 11 - 2, top + 10, 4, 16);

  // 몸통 — 평범한 사람이니 화려한 옷 대신 무난한 재킷
  ctx.fillStyle = '#e54e68';
  ctx.fillRect(left, top + 12, PLAYER_WIDTH, legTop - (top + 12));
  ctx.fillStyle = '#ffb86a';
  ctx.fillRect(player.x - 1, top + 12, 2, legTop - (top + 12)); // 지퍼 라인

  // 머리 (피부)
  ctx.fillStyle = '#ffd0a0';
  ctx.beginPath();
  ctx.arc(player.x, top + 8, 9, 0, Math.PI * 2);
  ctx.fill();

  // 머리카락 — 반원 하나만 얹어도 '캐릭터'가 아니라 '사람'처럼 보인다
  ctx.fillStyle = '#582047';
  ctx.beginPath();
  ctx.arc(player.x, top + 6, 9, Math.PI, Math.PI * 2);
  ctx.fill();

  // 바라보는 방향 표시 (눈) — 진행 방향을 눈으로 확인하기 위한 표시
  ctx.fillStyle = '#2b1740';
  ctx.beginPath();
  ctx.arc(player.x + player.facing * 4, top + 8, 2, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * 공중에서 커서 방향으로 조준선을 그린다.
 * 커서까지가 아니라 '사거리 끝까지' 항상 같은 길이로 그린다 —
 * 플레이어가 와이어가 어디까지 닿는지 눈으로 알 수 있어야 하기 때문.
 */
export function drawAimLine(player, aimX, aimY, maxLength, locked = false) {
  const dx = aimX - player.x;
  const dy = aimY - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return; // 커서가 캐릭터에 겹쳐 방향을 정할 수 없는 경우

  const endX = player.x + (dx / dist) * maxLength;
  const endY = player.y + (dy / dist) * maxLength;

  // locked = 지금 쏘면 탑에 걸린다. 수동 조준이라 이 예고가 없으면
  // 연속 스윙에서 걸릴지 여부를 매번 도박하게 된다.
  const color = locked ? '124, 255, 155' : '255, 224, 102';

  ctx.save();
  ctx.setLineDash(locked ? [] : [7, 7]);
  ctx.strokeStyle = `rgba(${color}, ${locked ? 0.85 : 0.55})`;
  ctx.lineWidth = locked ? 3 : 2;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.restore();

  // 사거리 끝 표시 — 여기까지가 와이어가 닿는 한계
  ctx.fillStyle = `rgba(${color}, 0.9)`;
  ctx.beginPath();
  ctx.arc(endX, endY, 4, 0, Math.PI * 2);
  ctx.fill();
}

/** 부착된 와이어와, 걸린 탑의 강조 표시. */
export function drawWire(player, anchor, swingRadius) {
  // 스윙 궤도 — 어디로 날아갈지 예측할 수 있게 옅게 표시한다
  if (swingRadius) {
    ctx.save();
    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = 'rgba(255, 210, 74, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, swingRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = 'rgba(69, 255, 220, 0.26)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(anchor.x, anchor.y);
  ctx.stroke();
  ctx.strokeStyle = '#a8fff0';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(anchor.x, anchor.y);
  ctx.stroke();
  ctx.restore();

  // 걸린 탑임을 알 수 있게 판정 원을 같은 색으로 덧그린다
  ctx.beginPath();
  ctx.arc(anchor.x, anchor.y, TUNING.ANCHOR_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * 헛방 친 와이어. 발사 방향으로 붉은 선이 잠깐 남는다.
 * @param {number} alpha 남은 시간에 비례한 투명도(1 → 0)
 */
export function drawMissShot(player, dirX, dirY, length, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#ff5a5a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x + dirX * length, player.y + dirY * length);
  ctx.stroke();
  ctx.restore();
}

/**
 * 동전들. 이미 먹은 것은 그리지 않는다.
 * (CP23에서 최종 비주얼로 교체 예정)
 */
export function drawCoins(coins) {
  for (const c of coins) {
    if (c.taken) continue;

    const gold = c.type === 'gold';
    const coinGlow = ctx.createRadialGradient(c.x - 3, c.y - 4, 1, c.x, c.y, COIN_RADIUS + 3);
    coinGlow.addColorStop(0, '#fff6bf');
    coinGlow.addColorStop(0.42, gold ? '#ffd24a' : '#d7fbff');
    coinGlow.addColorStop(1, gold ? '#e68132' : '#55aebb');
    ctx.fillStyle = coinGlow;
    ctx.beginPath();
    ctx.arc(c.x, c.y, COIN_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = gold ? 'rgba(122, 57, 34, 0.82)' : 'rgba(34, 92, 110, 0.82)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 광택 — 동전임이 한눈에 읽히게
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(c.x - 3, c.y - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 목표 지점(G) 깃대. goal.y는 깃대가 서 있는 지붕 표면이다.
 * (도달 판정은 CP16에서 붙는다)
 */
export function drawGoal(goal) {
  const poleHeight = 74;
  const top = goal.y - poleHeight;

  // 깃대
  ctx.fillStyle = '#c8d4e2';
  ctx.fillRect(goal.x - 2, top, 4, poleHeight);

  // 깃발
  ctx.fillStyle = '#ffd24a';
  ctx.beginPath();
  ctx.moveTo(goal.x + 2, top);
  ctx.lineTo(goal.x + 46, top + 13);
  ctx.lineTo(goal.x + 2, top + 26);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1b2233';
  ctx.font = 'bold 15px "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('G', goal.x + 17, top + 18);
  ctx.textAlign = 'left';
}

/**
 * 구간 퍼펙트 문구. 먹은 자리에서 떠올랐다 사라진다.
 * 화면 중앙 배너가 아니라 '그 자리'에 띄우는 이유 — 어느 구간을 완성했는지 바로 알 수 있다.
 *
 * @param {Array<{text:string,x:number,y:number,ttl:number,life:number}>} flashes
 */
export function drawPerfectFlashes(flashes) {
  for (const f of flashes) {
    const progress = 1 - f.ttl / f.life; // 0 → 1
    const alpha = Math.min(1, f.ttl / (f.life * 0.4)); // 마지막 40%에서 서서히 사라진다

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';

    ctx.font = 'bold 20px "Malgun Gothic", sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(10, 14, 26, 0.85)';
    ctx.strokeText(f.text, f.x, f.y - progress * 42);
    ctx.fillStyle = '#ffd24a';
    ctx.fillText(f.text, f.x, f.y - progress * 42);

    ctx.restore();
  }
  ctx.textAlign = 'left';
}

/**
 * 개발용 디버그 정보. 체크포인트 확인이 끝나면 제거한다.
 * HUD(CP21)가 화면 위쪽 40px을 쓰므로, 그 아래(기본 50px)부터 시작한다.
 */
export function drawDebugInfo(lines, startY = 58) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = '13px "Malgun Gothic", sans-serif';
  ctx.textAlign = 'left';
  lines.forEach((line, i) => {
    ctx.fillText(line, 16, startY + i * 18);
  });
}
