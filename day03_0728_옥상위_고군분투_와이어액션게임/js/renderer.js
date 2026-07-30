// 모든 드로잉을 담당. 게임 상태를 읽어서 그리기만 하고, 상태를 바꾸지 않는다.

import { ctx, GAME_WIDTH, GAME_HEIGHT } from './canvas.js';
import { PLAYER_WIDTH, PLAYER_HEIGHT } from './player.js';
import { TUNING } from './config.js';
import { COIN_RADIUS } from './coin.js';

// 배경 이미지 — 서울 야경(달/남산타워/스카이라인)을 통째로 담은 정적 아트.
// 카메라 위치와 무관하게 화면 전체에 고정으로 그린다(패럴랙스 없음) — 남산타워를
// "코스 어디에 있든 항상 같은 자리에" 보이게 하려던 예전 요구사항을 이미지 자체가 만족한다.
//
// 단, 이미지 아래쪽의 지하철은 정지 화면으로 두지 않는다. 하늘 부분만 이미지에서 잘라
// 고정 배경으로 깔고, 지하철 띠는 따로 떼어내 심연 안에서 좌우로 흘려보낸다(아래 참조).
const bgImage = new Image();
let bgImageReady = false;
bgImage.onload = () => {
  bgImageReady = true;
};
bgImage.src = 'images/배경.png';

// --- 심연을 달리는 지하철 ---
//
// 아래 좌표는 배경 이미지 원본(1376x768) 픽셀을 직접 훑어서 잰 값이다.
// 568행까지는 도시 실루엣이고 569행부터 차량 지붕이 시작하며, 745행 아래는 평평한 어둠이다.
const TRAIN_SRC_TOP = 569;
const TRAIN_SRC_BOTTOM = 745;

/**
 * 차량 한 칸의 가로 주기와, 칸 경계에 정확히 맞는 시작 x (원본 픽셀).
 *
 * 창문 패턴의 자기상관으로 주기 236을 찾고, 그 주기 안에서 좌우 끝 색이 가장 잘 맞는
 * 시작점 166을 골랐다. 이 한 칸만 옆으로 이어 붙이면 이음매가 눈에 띄지 않는다.
 * (이미지 전체 폭을 그대로 반복하면 좌우 끝 색차가 15배쯤 커서 이음매가 선으로 드러난다)
 */
const TRAIN_SRC_X = 166;
const TRAIN_SRC_PERIOD = 236;

/**
 * 지하철이 왼쪽으로 흘러가는 속도 (게임 px/s). 카메라와 무관한 자체 운행 속도다.
 * 130이었을 때는 배경치고 너무 분주해서 시선을 끌었다.
 */
const TRAIN_SPEED = 82;

/**
 * 미리 이어 붙여둔 지하철 띠. 매 프레임 타일을 여러 번 그리면 타일 경계마다
 * 실오라기 같은 세로줄이 생기는데(소수점 좌표 + 축소 샘플링), 화면보다 넓은 띠를
 * 한 번 만들어 두고 그 안에서 창을 옮겨가며 '한 번만' 그리면 이음매가 아예 없다.
 */
let trainStrip = null;
let trainStripRoofY = null; // 어느 옥상 높이로 만든 띠인지 — 높이가 바뀌면 다시 만든다

/**
 * 지하철 띠의 위치와 크기. **차량 지붕을 옥상 높이에 맞추고, 선로 끝이 화면 바닥에 닿게 한다.**
 *
 * 배경 이미지의 원래 배율을 그대로 쓰면 차량 지붕이 옥상선보다 32px 위로 솟아서,
 * 지하철이 건물보다 높이 뜬 것처럼 보였다. 지붕을 옥상 높이로 내리면 남는 세로 공간이
 * 100px뿐이라 그만큼 줄여야 하는데, 세로만 눌러 맞추면 차량이 납작해지므로
 * 가로세로 같은 배율로 줄인다. 차량이 조금 작아지지만 멀리 있는 것처럼 보여 깊이감에 도움이 된다.
 *
 * @param {number} roofY 옥상 표면 높이 = 심연이 시작되는 y
 */
function trainLayout(roofY) {
  const height = GAME_HEIGHT - roofY;
  const scale = height / (TRAIN_SRC_BOTTOM - TRAIN_SRC_TOP);
  return {
    // 타일 폭만 정수로 반올림한다 — 띠를 만들 때 칸을 정수 좌표에 딱 붙여 쌓기 위한 것으로,
    // 0.4% 차이라 차량 비율은 눈에 띄게 변하지 않는다.
    tileW: Math.round(TRAIN_SRC_PERIOD * scale),
    top: roofY,
    height,
  };
}

/** 화면 폭 + 한 칸 이상을 덮는 지하철 띠를 한 번만 만들어 둔다. */
function buildTrainStrip(roofY) {
  const { tileW, height } = trainLayout(roofY);
  const tiles = Math.ceil(GAME_WIDTH / tileW) + 1;
  const strip = document.createElement('canvas');
  strip.width = tileW * tiles;
  strip.height = height;
  const sctx = strip.getContext('2d');
  for (let i = 0; i < tiles; i++) {
    sctx.drawImage(
      bgImage,
      TRAIN_SRC_X, TRAIN_SRC_TOP, TRAIN_SRC_PERIOD, TRAIN_SRC_BOTTOM - TRAIN_SRC_TOP,
      i * tileW, 0, tileW, height,
    );
  }
  return strip;
}

/**
 * 밤하늘 배경. 지하철 띠를 뺀 윗부분(하늘/달/남산타워/스카이라인)만 그린다 —
 * 지하철은 심연 안에서 따로 움직인다.
 *
 * 하늘을 옥상 높이까지 늘려 채우는 이유: 지하철을 옥상선으로 내리면 원래 지하철이 있던
 * 자리(옥상선 위 40px)가 비는데, 이미지에서 지하철 바로 위 띠는 세로로 균일하지 않아
 * (같은 색으로 이어지는 열이 34%뿐) 아래로 늘려 메우면 얼룩진 세로 줄이 생긴다.
 * 하늘 전체를 11% 늘리는 쪽이 국소적인 얼룩보다 눈에 덜 띄고, 남산타워도 HUD에 안 가린다.
 *
 * 이미지가 아직 로드되기 전(첫 프레임)에는 어두운 단색으로 빈 화면을 메운다.
 *
 * @param {number} roofY 옥상 표면 높이 = 심연이 시작되는 y
 */
export function drawBackground(roofY) {
  if (!bgImageReady) {
    ctx.fillStyle = '#1c0f3a';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    return;
  }
  ctx.drawImage(
    bgImage,
    0, 0, bgImage.naturalWidth, TRAIN_SRC_TOP,
    0, 0, GAME_WIDTH, roofY,
  );
  // 옥상선 아래는 심연과 지하철이 덮지만, 로드 타이밍이나 반올림으로 한 줄이 비더라도
  // 밝은 틈이 보이지 않도록 이미지 맨 아래와 같은 어두운 색을 미리 깔아둔다.
  ctx.fillStyle = '#0c1327';
  ctx.fillRect(0, roofY, GAME_WIDTH, GAME_HEIGHT - roofY);
}

/**
 * 심연을 지나가는 지하철. 차량 지붕이 옥상 높이에 맞춰져 있어 낭떠러지 틈으로만 보인다.
 * 카메라가 아니라 시간으로 움직이므로 플레이어가 멈춰 있어도(타이틀 화면에서도) 계속 달린다.
 *
 * @param {number} roofY 옥상 표면 높이 = 심연이 시작되는 y
 * @param {number} time 누적 경과 시간(초)
 */
function drawAbyssTrain(roofY, time) {
  if (!bgImageReady) return;
  if (!trainStrip || trainStripRoofY !== roofY) {
    trainStrip = buildTrainStrip(roofY);
    trainStripRoofY = roofY;
  }

  const { tileW, top, height } = trainLayout(roofY);
  // 한 칸 주기로 접은 오프셋만큼 띠 안에서 오른쪽을 잘라 보여주면, 내용은 왼쪽으로 흘러간다.
  const offset = (time * TRAIN_SPEED) % tileW;
  ctx.drawImage(
    trainStrip,
    offset, 0, GAME_WIDTH, height,
    0, top, GAME_WIDTH, height,
  );
}

/**
 * 낭떠러지(지붕 아래의 심연).
 * 지붕보다 먼저 그린다 — 지붕이 없는 구간이 그대로 어두운 낭떠러지로 드러난다.
 * 배경 하늘색이 아래까지 이어지면 '떨어지면 죽는 곳'으로 읽히지 않는다.
 *
 * 어두운 그라데이션을 깔고 그 위로 지하철을 지나가게 하는 두 겹 구성이다.
 * 지하철이 심연을 정확히 채우므로 그라데이션은 평소엔 보이지 않지만,
 * 이미지 로드 전이나 반올림으로 한 줄이 빌 때를 받쳐주는 바탕으로 남겨둔다.
 *
 * 예전에는 여기에 바닥 실루엣(반투명 사각형 + 작은 창문)과 심연 경계선도 그렸지만,
 * 둘 다 지하철 띠 위에 겹쳐 그려지는 위치라 차량에 얼룩이 낀 잔상처럼 보였다.
 * 텅 빈 어두운 심연을 전제로 만든 장식이라 지하철이 그 자리를 채운 지금은 필요가 없어 걷어냈다.
 *
 * @param {number} top 심연이 시작되는 y (가장 낮은 옥상 높이)
 * @param {number} time 누적 경과 시간(초) — 지하철 운행에 쓴다.
 */
export function drawAbyss(top, time = 0) {
  const depth = ctx.createLinearGradient(0, top, 0, GAME_HEIGHT);
  depth.addColorStop(0, '#07333b');
  depth.addColorStop(0.36, '#082035');
  depth.addColorStop(1, '#030714');
  ctx.fillStyle = depth;
  ctx.fillRect(0, top, GAME_WIDTH, GAME_HEIGHT - top);

  drawAbyssTrain(top, time);
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

    // 가로대(완목) — 와이어가 실제로 걸리는 고리가 이 위에 얹혀 있는 것처럼 보이게 한다.
    //
    // 폭은 부착 판정 반경(ANCHOR_RADIUS=54)에 맞춰 ±52로 둔다. 조준하기 쉽게 넓혀달라는
    // 요청으로 한때 ±81까지 늘렸지만, 전봇대 간격을 105~130px로 촘촘하게 바꾼 뒤로는
    // 옆 전봇대의 가로대와 겹쳐 두 개가 한 개의 긴 막대처럼 보였다.
    // 걸리는 난이도는 가로대 그림이 아니라 ANCHOR_RADIUS가 정하므로(그대로 54),
    // 폭을 판정 반경에 맞추면 '보이는 대로 걸린다'가 되어 오히려 정직하다.
    ctx.strokeStyle = '#461a48';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(a.x - 52, a.y - 3);
    ctx.lineTo(a.x + 52, a.y - 3);
    ctx.stroke();

    // 애자(碍子) — 가로대 양 끝의 흰 사기 절연체 (가로대 폭에 맞춰 함께 넓어짐)
    ctx.fillStyle = '#77f3d1';
    ctx.beginPath();
    ctx.arc(a.x - 45, a.y - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(a.x + 45, a.y - 3, 4, 0, Math.PI * 2);
    ctx.fill();

    // 처진 전깃줄 한 가닥 — 장식용, 판정에는 영향 없다
    ctx.strokeStyle = 'rgba(38, 16, 57, 0.72)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(a.x - 45, a.y - 1);
    ctx.quadraticCurveTo(a.x, a.y + 10, a.x + 45, a.y - 1);
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
 * 별사탕 하나의 실루엣. 짧고 둥근 돌기가 여러 개 달린 사탕 모양이다.
 *
 * 돌기를 삼각형으로 찍으면 뾰족한 별이 되어버리므로 2차 베지어로 둥글린다.
 * 제어점을 반지름 R보다 밖에 두는 이유: 2차 베지어는 제어점을 지나지 않고
 * 중점이 (P0 + 2C + P2)/4 라서, 돌기 끝이 실제로 R에 닿게 하려면 보정이 필요하다.
 */
function konpeitoPath(cx, cy, R, rot, bumps) {
  const step = (Math.PI * 2) / bumps;
  // 골짜기를 얕게(0.78) 둬야 '돌기 달린 둥근 사탕'이 된다.
  // 0.66으로 깊게 파봤더니 지름 22px 화면에서는 뾰족한 별 섬광처럼 보였다.
  const r = R * 0.78;
  const cR = 2 * R - r * Math.cos(step / 2);

  ctx.beginPath();
  for (let i = 0; i < bumps; i++) {
    const aV = rot + i * step;
    if (i === 0) ctx.moveTo(cx + Math.cos(aV) * r, cy + Math.sin(aV) * r);
    ctx.quadraticCurveTo(
      cx + Math.cos(aV + step / 2) * cR, cy + Math.sin(aV + step / 2) * cR,
      cx + Math.cos(aV + step) * r, cy + Math.sin(aV + step) * r,
    );
  }
  ctx.closePath();
}

/** 작은 4방향 섬광. 오목한 별 모양이라 '반짝'으로 읽힌다. */
function sparkle(x, y, s, alpha) {
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.closePath();
  ctx.fill();
}

/**
 * 별사탕들. 이미 먹은 것은 그리지 않는다.
 *
 * 위치는 건드리지 않고 회전/반짝임만 시간에 따라 변한다 —
 * 획득 판정은 c.x/c.y 를 그대로 쓰므로, 위아래로 흔들면 보이는 자리와 판정 자리가 어긋난다.
 *
 * @param {number} time 누적 경과 시간(초)
 */
export function drawCoins(coins, time = 0) {
  const R = COIN_RADIUS;

  for (const c of coins) {
    if (c.taken) continue;

    const gold = c.type === 'gold';
    // 사탕마다 위상을 달리 준다 — 전부 같이 반짝이면 기계적으로 보인다
    const phase = c.x * 0.017 + c.y * 0.011;
    const rot = time * 0.35 + phase;
    const tw = 0.5 + 0.5 * Math.sin(time * 2.3 + phase);

    // 은은한 후광. 너무 밝으면 사탕 자체가 하얗게 날아가므로 옅게만 깐다.
    const halo = ctx.createRadialGradient(c.x, c.y, R * 0.6, c.x, c.y, R * 2);
    halo.addColorStop(0, gold
      ? `rgba(255, 196, 74, ${(0.20 + 0.12 * tw).toFixed(3)})`
      : `rgba(255, 138, 190, ${(0.18 + 0.11 * tw).toFixed(3)})`);
    halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(c.x, c.y, R * 2, 0, Math.PI * 2);
    ctx.fill();

    // 사탕 몸통 — 왼쪽 위에서 빛이 드는 파스텔. 방사형 대신 선형 그라데이션을 쓴다:
    // 반지름 11px에서 방사형을 쓰면 중심의 흰색이 거의 전체를 덮어 색이 사라진다.
    konpeitoPath(c.x, c.y, R, rot, 7);
    // 밝은 색 구간을 좁게(0.3) 잡는다 — 반씩 나누면 밝은 쪽이 시각적으로 압도해
    // 사탕이 그냥 하얗게 보인다. 기본 사탕을 분홍으로 둔 것도 대비 때문이다:
    // 하늘이 청록이고 옥상이 자주색이라, 파란 사탕은 배경에 묻혀 잘 안 보였다.
    const body = ctx.createLinearGradient(c.x - R, c.y - R, c.x + R * 0.7, c.y + R);
    if (gold) {
      body.addColorStop(0, '#ffeeae');
      body.addColorStop(0.3, '#ffc93f');
      body.addColorStop(1, '#d9741c');
    } else {
      body.addColorStop(0, '#ffe4f0');
      body.addColorStop(0.3, '#ff9fc8');
      body.addColorStop(1, '#d4508f');
    }
    ctx.fillStyle = body;
    ctx.fill();
    // 테두리를 또렷하게 — 밤 배경 위에서 사탕 실루엣이 뭉개지지 않게 한다
    ctx.strokeStyle = gold ? 'rgba(112, 52, 8, 0.9)' : 'rgba(105, 26, 66, 0.9)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 설탕 광택 — 작은 흰 점 하나로 '사탕'임이 읽힌다
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.ellipse(c.x - R * 0.28, c.y - R * 0.32, R * 0.24, R * 0.15, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // 반짝임은 몸통 위가 아니라 오른쪽 위 바깥에 — 사탕 모양을 가리지 않는다
    sparkle(c.x + R * 0.9, c.y - R * 0.9, R * (0.18 + 0.3 * tw), 0.2 + 0.45 * tw);
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
