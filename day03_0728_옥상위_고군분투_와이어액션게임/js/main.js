// 진입점: 게임 루프를 돌리고 각 모듈을 조립한다.

import { ctx, canvas, GAME_WIDTH, GAME_HEIGHT } from './canvas.js';
import {
  createPlayer,
  updateGround,
  updateAirFree,
  jump,
  landOn,
  playerBottom,
  PlayerState,
} from './player.js';
import {
  findLanding,
  isOnPlatform,
  hasFallen,
  reachedGoal,
} from './collision.js';
import { mouse, consumePress, consumeRelease } from './input.js';
import { loadStage } from './stage.js';
import { createCamera, updateCamera } from './camera.js';
import {
  collectCoins,
  coinProgress,
  checkPerfectGroups,
  groupProgress,
  PERFECT_BONUS,
} from './coin.js';
import { tryAttach, startSwing, updateSwing, releaseSwing } from './wire.js';
import { TUNING } from './config.js';
import {
  playWireFire,
  playWireAttach,
  playCoin,
  playPerfect,
  playFall,
  playClear,
} from './audio.js';
import {
  drawBackground,
  drawAbyss,
  drawPlatforms,
  drawAnchors,
  drawCoins,
  drawGoal,
  drawPlayer,
  drawAimLine,
  drawWire,
  drawMissShot,
  drawPerfectFlashes,
  // drawDebugInfo, // 디버그 오버레이 — 아래 render()의 주석 처리된 호출과 함께 필요할 때만 켠다
} from './renderer.js';
import {
  RETRY_BUTTONS,
  TITLE_BUTTONS,
  CLEAR_BUTTONS,
  buttonAt,
  drawRetryPopup,
  drawClearPopup,
  drawTitleScreen,
  drawHUD,
} from './ui.js';
// import { createTuningPanel } from './devtools.js'; // 개발용 튜닝 패널 — 필요할 때만 주석 해제

/** 현재 진행 중인 스테이지 (stage.js 데이터에서 펼쳐진 것). */
let stage = loadStage(0);

/** 오토런 카메라. 스테이지 시작마다 x=0으로 리셋된다. */
let camera = createCamera();

/** 게임 진행 상태. */
const GameState = {
  TITLE: 'TITLE', // 타이틀 화면 — "게임 시작"을 눌러야 플레이가 시작된다
  PLAYING: 'PLAYING',
  FALLEN: 'FALLEN', // 추락 확정 — "재시도?" 팝업이 뜨고 조작이 멈춘다
  CLEARED: 'CLEARED', // G지점 도달 — 클리어 화면
};

// 게임은 타이틀 화면에서 시작한다
let gameState = GameState.TITLE;

const player = createPlayer(stage.spawn.x, stage.spawn.y);

/** 현재 걸려 있는 와이어. { anchor, length } 또는 null */
let wire = null;

/** 헛방 표시. { dirX, dirY, ttl } 또는 null */
let missFlash = null;

/** 착지 없이 연속으로 와이어를 건 횟수. 지상에 닿으면 초기화된다. */
let chainCount = 0;

/** 현재 스테이지에서 모은 점수. */
let score = 0;

/** 퍼펙트 보너스를 이미 지급한 구간 번호. */
let perfectAwarded = new Set();

/** 화면에 떠 있는 퍼펙트 문구들. */
let perfectFlashes = [];

let lastTime = 0;

/** 누적 경과 시간(초). 배경의 별 반짝임처럼 '항상 흘러야 하는' 애니메이션에 쓴다 — 팝업으로
 * 조작이 멈춰 있을 때도 계속 흐르도록 update()가 아니라 loop()에서 직접 늘린다. */
let clock = 0;

/**
 * 지금 이 위치에서의 실제 오토런 속도.
 * 기준 속도 × 코스 진행률에 따른 배율. (SPEED_SCALE_PREVIEW는 개발용 미리보기 — 배포 전 제거)
 *
 * 예전에는 스테이지 번호로 계단식으로 올렸지만, 스테이지가 하나로 이어진 뒤로는
 * '지금까지 달려온 거리'로 매끄럽게 올린다 — 챕터 경계에서 속도가 툭 튀지 않는다.
 */
function runSpeed() {
  return TUNING.AUTO_RUN_SPEED * stage.speedScaleAt(player.x) * TUNING.SPEED_SCALE_PREVIEW;
}

/**
 * 화면(마우스) 좌표를 월드 좌표로 바꾼다.
 * 카메라가 스크롤된 만큼 화면과 월드 좌표가 어긋나므로, 조준/판정은 항상
 * 월드 좌표끼리 비교해야 한다. 세로는 스크롤되지 않으므로 그대로 쓴다.
 */
function toWorldX(screenX) {
  return screenX + camera.x;
}

/** 공중에서 클릭했을 때 — 커서 방향으로 와이어를 쏜다. */
function fireWire() {
  const aimX = toWorldX(mouse.x);
  const aimY = mouse.y;
  const hit = tryAttach(player, aimX, aimY, stage.anchors);
  playWireFire();

  if (hit) {
    wire = hit;
    startSwing(player, wire); // 날아온 속도를 회전 속도로 이어받는다
    player.state = PlayerState.AIR_WIRED;
    missFlash = null;
    chainCount += 1;
    playWireAttach();
    return;
  }

  // 헛방 — 어디로 쐈는지 붉은 선으로 잠깐 보여준다
  const dx = aimX - player.x;
  const dy = aimY - player.y;
  const d = Math.hypot(dx, dy);
  if (d >= 1) {
    missFlash = { dirX: dx / d, dirY: dy / d, ttl: TUNING.WIRE_MISS_FLASH };
  }
}

/** 와이어를 놓는다 — 그 순간의 접선 속도를 관성으로 이어받아 날아간다. */
function releaseWire() {
  releaseSwing(player);
  wire = null;
  player.state = PlayerState.AIR_FREE;
}

/**
 * 지정한 스테이지를 처음부터 시작한다.
 * 스테이지를 다시 로드하는 이유: 먹은 동전 등 판 안에서 변한 상태를 되돌려야 한다.
 */
function startStage(index) {
  stage = loadStage(index);
  camera = createCamera();
  wire = null;
  missFlash = null;
  chainCount = 0;
  score = 0;
  perfectAwarded = new Set();
  perfectFlashes = [];
  gameState = GameState.PLAYING;
  Object.assign(player, {
    x: stage.spawn.x,
    y: stage.spawn.y,
    vx: 0,
    vy: 0,
    state: PlayerState.GROUND,
    facing: 1,
  });
}

/**
 * 코스를 처음부터 다시 시작한다.
 * 사용자 요청: 어디서 떨어지든 항상 코스 맨 처음(1단계)부터 — 중간 체크포인트는 두지 않는다.
 */
function restart() {
  startStage(0);
}

/** 코스를 완주했을 때 — 타이틀로 돌아간다. */
function advance() {
  stage = loadStage(0);
  gameState = GameState.TITLE;
}

/**
 * 매 프레임 상태를 갱신한다.
 * @param {number} dt 이전 프레임과의 시간 간격(초)
 */
function update(dt) {
  if (gameState === GameState.TITLE) {
    consumeRelease();
    if (consumePress() && buttonAt(TITLE_BUTTONS, mouse.x, mouse.y) === 'start') {
      restart();
    }
    return;
  }

  if (gameState === GameState.FALLEN) {
    // 조작은 멈추고, 팝업 버튼만 반응한다
    consumeRelease();
    if (consumePress()) {
      const picked = buttonAt(RETRY_BUTTONS, mouse.x, mouse.y);
      if (picked === 'retry') restart();
      else if (picked === 'quit') gameState = GameState.TITLE;
    }
    return;
  }

  if (gameState === GameState.CLEARED) {
    consumeRelease();
    if (consumePress() && buttonAt(CLEAR_BUTTONS, mouse.x, mouse.y) === 'next') {
      advance();
    }
    return;
  }

  if (consumePress()) {
    if (player.state === PlayerState.GROUND) {
      jump(player);
    } else if (player.state === PlayerState.AIR_FREE) {
      fireWire();
    }
  }

  if (consumeRelease() && player.state === PlayerState.AIR_WIRED) {
    releaseWire();
  }

  if (missFlash) {
    missFlash.ttl -= dt;
    if (missFlash.ttl <= 0) missFlash = null;
  }

  if (perfectFlashes.length > 0) {
    for (const f of perfectFlashes) f.ttl -= dt;
    perfectFlashes = perfectFlashes.filter((f) => f.ttl > 0);
  }

  if (player.state === PlayerState.GROUND) {
    updateGround(player, dt, runSpeed());

    // 지붕 끝을 걸어서 넘어서면 클릭 없이도 낭떠러지로 떨어지기 시작한다
    if (!isOnPlatform(player, stage.platforms)) {
      player.vy = 0;
      player.state = PlayerState.AIR_FREE;
    }
  } else if (player.state === PlayerState.AIR_FREE) {
    // 공중에서는 캐릭터가 조준하는 쪽을 바라본다 (커서는 월드 좌표로 바꿔서 비교)
    const aimWorldX = toWorldX(mouse.x);
    if (aimWorldX !== player.x) player.facing = aimWorldX > player.x ? 1 : -1;

    // 충돌 판정이 통과 여부를 알아야 하므로 이동 '전' 발바닥 위치를 기억해둔다
    const prevBottom = playerBottom(player);
    updateAirFree(player, dt);

    const roof = findLanding(player, prevBottom, stage.platforms);
    if (roof) {
      landOn(player, roof.y, runSpeed());
      chainCount = 0; // 지붕에 닿으면 연속이 끊긴다
    }
  } else if (player.state === PlayerState.AIR_WIRED) {
    const prevBottom = playerBottom(player);
    updateSwing(player, wire, dt);

    // 스윙 중 진행 방향을 바라본다
    if (player.vx !== 0) player.facing = player.vx > 0 ? 1 : -1;

    // 스윙하다 지붕에 닿으면 와이어가 풀리고 착지한다
    const roof = findLanding(player, prevBottom, stage.platforms);
    if (roof) {
      wire = null;
      landOn(player, roof.y, runSpeed());
      chainCount = 0;
    }
  }

  // 이동이 끝난 뒤 카메라를 갱신한다 (한 프레임 지연 없이 바로 반영)
  updateCamera(camera, player);

  // 이동이 끝난 자리에서 동전을 먹는다 (스윙이든 비행이든 같은 판정)
  const collected = collectCoins(player, stage.coins);
  score += collected.gained;
  for (const c of collected.picked) playCoin(c.type);

  // 구간을 다 모았으면 퍼펙트 보너스
  const perfect = checkPerfectGroups(stage.coins, perfectAwarded);
  if (perfect.bonus > 0) {
    score += perfect.bonus;
    playPerfect();
    for (const g of perfect.completed) {
      perfectFlashes.push({
        text: `${g.group}구간 퍼펙트! +${PERFECT_BONUS}`,
        x: player.x,
        y: player.y - 26,
        ttl: TUNING.PERFECT_FLASH_DURATION,
        life: TUNING.PERFECT_FLASH_DURATION,
      });
    }
  }

  // 목표 지점에 닿았는가 (추락보다 먼저 본다 — 동시에 성립할 수는 없지만 승리를 우선)
  // 플레이가 멈추면 문구 타이머도 멈추므로, 남아 있던 연출은 정리하고 넘어간다
  if (reachedGoal(player, stage.goal)) {
    wire = null;
    missFlash = null;
    perfectFlashes = [];
    gameState = GameState.CLEARED;
    playClear();
    return;
  }

  // 낭떠러지로 떨어졌는가
  if (hasFallen(player, GAME_HEIGHT)) {
    wire = null;
    missFlash = null;
    perfectFlashes = [];
    gameState = GameState.FALLEN;
    playFall();
  }
}

/** 매 프레임 화면을 그린다. */
function render() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // 배경/심연은 스크롤과 무관하게 화면 전체를 덮는 고정 배경이다 — 번역(translate) 밖에서 그린다.
  // 배경 하늘과 심연의 지하철은 옥상 높이(abyssTop)를 기준으로 맞춰 그린다 —
  // 지하철 차량 지붕이 옥상선에 정확히 닿아야 건물보다 높이 뜬 것처럼 보이지 않는다.
  drawBackground(stage.abyssTop);
  drawAbyss(stage.abyssTop, clock);

  // 조준 판정에 쓰는 마우스는 항상 월드 좌표로 변환해서 써야 한다 —
  // 화면 좌표를 그대로 쓰면 카메라가 스크롤된 만큼 조준이 어긋난다.
  const worldMouseX = toWorldX(mouse.x);
  const worldMouseY = mouse.y;

  // 지금 쏘면 걸릴 탑을 미리 알려준다 (순수 함수라 판정과 100% 일치한다)
  const aiming =
    gameState === GameState.PLAYING && player.state === PlayerState.AIR_FREE;
  const preview = aiming
    ? tryAttach(player, worldMouseX, worldMouseY, stage.anchors)
    : null;

  // 여기서부터 화면을 -camera.x만큼 밀어 그린다 — 이 블록 안의 좌표는 전부 '월드 좌표'다.
  ctx.save();
  ctx.translate(-camera.x, 0);

  drawPlatforms(stage.platforms);
  drawCoins(stage.coins, clock);
  drawGoal(stage.goal);
  drawAnchors(
    stage.anchors,
    aiming ? player : null,
    preview ? preview.anchor : null,
  );

  // 타이틀 화면에서는 게임 세계를 배경 장식으로만 보여주고, 캐릭터/조준/와이어는 그리지 않는다
  if (gameState !== GameState.TITLE) {
    // 조준선은 공중에서만 — 지상에서는 클릭이 점프이므로 조준할 대상이 없다
    if (aiming) {
      drawAimLine(player, worldMouseX, worldMouseY, TUNING.WIRE_MAX_LENGTH, !!preview);
    }

    if (missFlash) {
      drawMissShot(player, missFlash.dirX, missFlash.dirY, TUNING.WIRE_MAX_LENGTH,
        missFlash.ttl / TUNING.WIRE_MISS_FLASH);
    }

    if (wire) drawWire(player, wire.anchor, wire.length);

    drawPlayer(player);
    drawPerfectFlashes(perfectFlashes);
  }

  ctx.restore();

  // ---- 이 아래부터는 화면 좌표(스크린 스페이스) — 카메라와 무관하게 고정된 UI ----

  if (gameState === GameState.TITLE) {
    drawTitleScreen(mouse);
    canvas.style.cursor = buttonAt(TITLE_BUTTONS, mouse.x, mouse.y)
      ? 'pointer'
      : 'default';
    return;
  }

  const coinStat = coinProgress(stage.coins);
  drawHUD({
    score,
    coinsTaken: coinStat.taken,
    coinsTotal: coinStat.total,
    progress: Math.min(1, player.x / stage.courseLength),
  });

  // 개발용 디버그 오버레이 — 필요할 때만 아래 주석을 풀고 확인한다.
  // const groups = [...groupProgress(stage.coins)]
  //   .map(([id, g]) => `${id}:${g.taken}/${g.total}${g.taken === g.total ? '★' : ''}`)
  //   .join('  ');
  // drawDebugInfo([
  //   'CP22: 하나로 이어진 코스',
  //   `진행 ${player.x.toFixed(0)} / ${stage.courseLength} (${(Math.min(1, player.x / stage.courseLength) * 100).toFixed(0)}%)`,
  //   `속도배율 ×${stage.speedScaleAt(player.x).toFixed(2)}   오토런 ${runSpeed().toFixed(0)} px/s`,
  //   `점수 ${score}   동전 ${coinProgress(stage.coins).taken}/${coinProgress(stage.coins).total}`,
  //   `구간 ${groups}`,
  //   `게임 상태: ${gameState}   state: ${player.state}`,
  //   `월드 x ${player.x.toFixed(0)}   카메라 x ${camera.x.toFixed(0)}`,
  //   wire
  //     ? `θ ${((wire.theta * 180) / Math.PI).toFixed(0)}°  ω ${wire.omega.toFixed(2)} rad/s  L ${wire.length.toFixed(0)}`
  //     : preview
  //       ? '조준 잠김 — 클릭하면 걸린다'
  //       : '와이어 없음',
  //   `연속 스윙: ${chainCount}회`,
  //   missFlash ? '헛방!' : '',
  // ]);

  if (gameState === GameState.FALLEN) {
    drawRetryPopup(mouse);
    // 버튼 위에서는 커서를 손가락으로 — 누를 수 있는 곳임을 알려준다
    canvas.style.cursor = buttonAt(RETRY_BUTTONS, mouse.x, mouse.y)
      ? 'pointer'
      : 'default';
  } else if (gameState === GameState.CLEARED) {
    const progress = coinProgress(stage.coins);
    const groupList = [...groupProgress(stage.coins)];
    drawClearPopup(mouse, {
      score,
      coinsTaken: progress.taken,
      coinsTotal: progress.total,
      perfectGroups: groupList.filter(([, g]) => g.taken === g.total).length,
      totalGroups: groupList.length,
    });
    canvas.style.cursor = buttonAt(CLEAR_BUTTONS, mouse.x, mouse.y)
      ? 'pointer'
      : 'default';
  } else {
    canvas.style.cursor = 'crosshair';
  }
}

/** requestAnimationFrame 루프. */
function loop(timestamp) {
  // dt는 최대 0.05초로 제한 — 탭 전환 등으로 프레임이 밀렸을 때 물리가 튀는 것을 방지
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  clock += dt;

  update(dt);
  render();

  requestAnimationFrame(loop);
}

// 첫 프레임은 동기적으로 즉시 그린다 (rAF 첫 콜백 전 빈 화면이 보이는 것을 방지).
render();

requestAnimationFrame((t) => {
  lastTime = t;
  requestAnimationFrame(loop);
});

// --- 개발용 튜닝 패널 (숨김) ---
// CP25에서 확정한 튜닝값(config.js)으로 플레이하므로 패널을 화면에서 내렸다.
// 값 조정이 다시 필요해지면 위 import 주석을 풀고 아래 호출도 살리면 된다.
// createTuningPanel();

// --- 개발용 핸들 (배포 전 제거) ---
// Browser 패널이 비활성이면 requestAnimationFrame이 멈춰 물리를 확인할 수 없다.
// 고정 dt로 수동 스텝을 밟아 동작을 검증하기 위한 통로.
window.__dev = {
  player, update, render,
  getStage: () => stage,
  getWire: () => wire,
  getMissFlash: () => missFlash,
  getChainCount: () => chainCount,
  getScore: () => score,
  getGameState: () => gameState,
  setGameState: (s) => { gameState = s; },
  getCamera: () => camera,
  getClock: () => clock,
  setClock: (v) => { clock = v; },
  toWorldX,
  runSpeed,
  restart,
  startStage,
};
