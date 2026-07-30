// 개발용 자동 플레이 하네스 (devtools.js 처럼 배포 대상이 아니다).
// main.js가 import하지 않으므로 평소에는 로드되지 않고, 필요할 때 콘솔에서 불러 쓴다:
//
//   const m = await import('/js/autoplay.js');
//   m.play({ releaseDeg: 76 });   // 1회 자동 플레이 → { result, traj, events, ... }
//   m.sweep();                    // 놓는 각도를 훑어 완주 가능한 값 찾기
//
// **stage.js의 COINS 표는 이 하네스로 뽑은 궤적에서 만든 값이다.**
// 속도(SPEED_SCALE_PREVIEW, AUTO_RUN_SPEED)나 지형/앵커를 바꾸면 궤적이 달라지므로,
// 그때는 여기서 궤적을 다시 뽑아 COINS를 재생성해야 한다.
//
// 물리 상수는 하드코딩하지 않고 게임과 같은 모듈에서 가져온다 —
// 값이 어긋나면 계획한 경로와 실제 경로가 달라져 하네스가 거짓말을 하게 된다.
//
// 조작은 실제 마우스 이벤트를 합성해 넣고 판정/이동은 실제 게임 코드(__dev.update)가 하므로,
// 기록되는 궤적은 '시뮬레이션 결과'가 아니라 진짜 플레이 결과다. 아래 물리 미러는
// '지금 놓으면 어디에 떨어지는가'를 미리 재보는 예측용으로만 쓴다.

import { TUNING } from './config.js';
import { PLAYER_WIDTH, PLAYER_HEIGHT } from './player.js';

const DT = 1 / 60;
const HW = PLAYER_WIDTH / 2;
const HH = PLAYER_HEIGHT / 2;

// --- 물리 미러 (main.js update()의 분기와 순서를 그대로 따라간다) ---

function runSpeedAt(stage, x) {
  return TUNING.AUTO_RUN_SPEED * stage.speedScaleAt(x) * TUNING.SPEED_SCALE_PREVIEW;
}

function findLanding(x, y, prevBottom, platforms) {
  const bottom = y + HH;
  for (const p of platforms) {
    if (x + HW < p.x || x - HW > p.x + p.width) continue;
    if (prevBottom <= p.y && bottom >= p.y) return p;
  }
  return null;
}

function isOnPlatform(x, y, platforms) {
  const bottom = y + HH;
  return platforms.some(
    (p) => Math.abs(bottom - p.y) < 0.5 && x + HW >= p.x && x - HW <= p.x + p.width,
  );
}

/** wire.js rayCircleDistance 와 같은 식. */
function rayCircleDistance(ox, oy, dx, dy, cx, cy, r) {
  const mx = ox - cx;
  const my = oy - cy;
  const b = mx * dx + my * dy;
  const c = mx * mx + my * my - r * r;
  if (c < 0) return 0;
  const disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : null;
}

/**
 * wire.js tryAttach 미러. '조준한 앵커'가 아니라 '광선에 가장 먼저 걸리는 앵커'가
 * 잡히므로, 판정 반경이 커진 지금은 앞의 앵커를 겨눴는데 중간 앵커가 걸릴 수 있다.
 * 계획이 틀어지지 않도록 실제 판정과 똑같이 계산한다.
 */
function simAttach(s, aimX, aimY, anchors) {
  const dx = aimX - s.x;
  const dy = aimY - s.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return null;
  const ux = dx / dist;
  const uy = dy / dist;

  let best = null;
  for (const a of anchors) {
    const t = rayCircleDistance(s.x, s.y, ux, uy, a.x, a.y, TUNING.ANCHOR_RADIUS);
    if (t === null || t > TUNING.WIRE_MAX_LENGTH) continue;
    if (!best || t < best.t) best = { anchor: a, t };
  }
  if (!best) return null;
  return { anchor: best.anchor, L: Math.hypot(best.anchor.x - s.x, best.anchor.y - s.y) };
}

const clone = (s) => ({
  x: s.x, y: s.y, vx: s.vx, vy: s.vy, state: s.state,
  wire: s.wire ? { ...s.wire } : null,
});

function step(s, stage) {
  const platforms = stage.platforms;
  if (s.state === 'GROUND') {
    s.vx = runSpeedAt(stage, s.x);
    s.x += s.vx * DT;
    if (!isOnPlatform(s.x, s.y, platforms)) {
      s.vy = 0;
      s.state = 'AIR_FREE';
    }
  } else if (s.state === 'AIR_FREE') {
    const prevBottom = s.y + HH;
    s.vy = Math.min(s.vy + TUNING.GRAVITY * DT, TUNING.MAX_FALL_SPEED);
    s.x += s.vx * DT;
    s.y += s.vy * DT;
    const roof = findLanding(s.x, s.y, prevBottom, platforms);
    if (roof) {
      s.y = roof.y - HH;
      s.vx = runSpeedAt(stage, s.x);
      s.vy = 0;
      s.state = 'GROUND';
    }
  } else if (s.state === 'AIR_WIRED') {
    const prevBottom = s.y + HH;
    const w = s.wire;
    const alpha = (TUNING.GRAVITY * TUNING.SWING_GRAVITY_SCALE * Math.cos(w.theta)) / w.L;
    w.omega = (w.omega + alpha * DT) * TUNING.SWING_DAMPING;
    w.theta += w.omega * DT;
    s.x = w.ax + Math.cos(w.theta) * w.L;
    s.y = w.ay + Math.sin(w.theta) * w.L;
    const sp = w.omega * w.L;
    s.vx = -Math.sin(w.theta) * sp;
    s.vy = Math.cos(w.theta) * sp;
    const roof = findLanding(s.x, s.y, prevBottom, platforms);
    if (roof) {
      s.wire = null;
      s.y = roof.y - HH;
      s.vx = runSpeedAt(stage, s.x);
      s.vy = 0;
      s.state = 'GROUND';
    }
  }
}

function attachSim(s, hit) {
  const theta = Math.atan2(s.y - hit.anchor.y, s.x - hit.anchor.x);
  s.wire = {
    ax: hit.anchor.x, ay: hit.anchor.y, L: hit.L, theta,
    omega: (s.vx * -Math.sin(theta) + s.vy * Math.cos(theta)) / hit.L,
  };
  s.state = 'AIR_WIRED';
}

function releaseSim(s) {
  s.vx *= TUNING.RELEASE_BOOST;
  s.vy *= TUNING.RELEASE_BOOST;
  s.wire = null;
  s.state = 'AIR_FREE';
}

const DEAD_Y = 540 + TUNING.FALL_DEATH_MARGIN;

/** 아무 조작 없이 흘려보냈을 때의 결말. 착지하면 성공, 화면 밖으로 떨어지면 실패. */
function rollout(s0, stage, maxFrames = 200) {
  const s = clone(s0);
  let maxX = s.x;
  let chainX = null;
  for (let i = 0; i < maxFrames; i++) {
    step(s, stage);
    maxX = Math.max(maxX, s.x);
    // 비행 중 어느 앵커든 잡을 수 있는 순간이 있었는지 (다음 스윙으로 이을 수 있다는 뜻)
    if (s.state === 'AIR_FREE') {
      for (const a of stage.anchors) {
        if (simAttach(s, a.x, a.y, stage.anchors)) { chainX = Math.max(chainX ?? -1e9, s.x); break; }
      }
    }
    if (s.state === 'GROUND') {
      const plat = landedOn(s, stage.platforms);
      return { landed: true, fell: false, x: s.x, y: s.y, frames: i + 1, maxX, chainX, plat };
    }
    if (s.y - HH > DEAD_Y) return { landed: false, fell: true, x: s.x, y: s.y, frames: i + 1, maxX, chainX, plat: null };
  }
  return { landed: false, fell: false, x: s.x, y: s.y, frames: maxFrames, maxX, chainX, plat: null };
}

function landedOn(s, platforms) {
  for (const p of platforms) {
    if (Math.abs(s.y + HH - p.y) < 0.5 && s.x + HW >= p.x && s.x - HW <= p.x + p.width) return p;
  }
  return null;
}

/**
 * 놓은 뒤의 비행 결말. '살아남는가'와 '얼마나 낮게 처지는가'를 함께 본다.
 *
 * viable = 안전하게 착지하거나, 죽기 전에 다음 앵커를 (줄 길이 상한 안에서) 잡을 수 있음.
 * 착지만 성공으로 보면 연속 스윙으로 이어가는 선택지가 전부 실패로 깎여서,
 * '높이 날아 다음 전봇대로 잇는' 플레이를 아예 찾지 못한다 — 이전 각도 훑기가 실패한 이유다.
 */
function rolloutViable(s0, stage, maxRope, maxFrames = 200) {
  const s = clone(s0);
  let lowest = s.y; // y가 클수록 낮다
  for (let i = 0; i < maxFrames; i++) {
    step(s, stage);
    lowest = Math.max(lowest, s.y);
    if (s.state === 'GROUND') {
      return { viable: s.x > s0.x + 10, landed: true, lowest, x: s.x };
    }
    if (s.y - HH > DEAD_Y) return { viable: false, landed: false, lowest, x: s.x };
    for (const a of stage.anchors) {
      const hit = simAttach(s, a.x, a.y, stage.anchors);
      if (hit && hit.anchor === a && hit.L <= maxRope) {
        return { viable: true, landed: false, lowest, x: s.x };
      }
    }
  }
  return { viable: false, landed: false, lowest, x: s.x };
}

/**
 * "가장 높이 나는" 계획. 후보는 (걸 앵커 × 놓는 프레임) 전부이고,
 * 살아남는 선택지 중에서 **호가 가장 덜 처지는 것**을 고른다.
 *
 * 예전 정책은 '건널 수 있으면 바로 놓기'였는데, 그러면 호의 최저점 근처에서 납작하게
 * 날아가 옥상선 아래까지 처졌다. 여기서는 최저점(lowest)을 직접 최소화한다.
 */
function planHigh(s0, stage, maxRope, existsOnly = false) {
  let best = null;
  for (const a of stage.anchors) {
    const hit = simAttach(s0, a.x, a.y, stage.anchors);
    if (!hit || hit.anchor !== a || hit.L > maxRope) continue;

    const s = clone(s0);
    attachSim(s, hit);
    let sawFwd = false;
    let swingLowest = s.y;
    for (let r = 1; r <= 90; r++) {
      step(s, stage);
      swingLowest = Math.max(swingLowest, s.y);
      if (s.state === 'GROUND') break;
      if (s.vx > 0) sawFwd = true;
      else if (sawFwd) break; // 앞으로 가는 첫 스윙만 (왕복 금지)
      if (r < MIN_HOLD || s.vx <= 0) continue;

      const c = clone(s);
      releaseSim(c);
      const o = rolloutViable(c, stage, maxRope);
      // **전진하지 않는 선택지는 버린다.** 이걸 빼고 '높이'만 최소화하면
      // 전봇대 근처에서 높게 맴도는 쪽이 항상 이겨서 갭을 영영 못 건넌다(실측: 111발/100초).
      if (!o.viable || o.x < s0.x + 40) continue;
      if (existsOnly) return { a, r, lowest: Math.max(swingLowest, o.lowest), prog: o.x, landed: o.landed };
      const lowest = Math.max(swingLowest, o.lowest);
      const cand = { a, r, lowest, prog: o.x, landed: o.landed };
      // 더 높은(lowest가 작은) 쪽 우선, 비슷하면 더 멀리 가는 쪽
      if (!best || lowest < best.lowest - 1
          || (Math.abs(lowest - best.lowest) <= 1 && cand.prog > best.prog)) best = cand;
    }
  }
  return best;
}

/**
 * 최소 유지 프레임. 사람이 누르고 떼는 데 걸리는 시간의 하한(10프레임 ≈ 0.17초)이다.
 *
 * 이걸 걸지 않으면 자동 플레이가 '1프레임만 걸고 바로 놓기'를 남발한다 — 부착 순간
 * 속도의 반지름 성분이 버려지고 접선 성분만 남는 성질을 이용해 방향만 꺾는 편법이라,
 * 실제로 64번 중 35번이 1프레임 스윙이었다. 사람은 그렇게 조작할 수 없다.
 */
const MIN_HOLD = 10;

/**
 * 이번 프레임에 걸 앵커를 고른다 — **앞에 있는 것 중 가장 가까운 것.**
 * 사람이 실제로 하는 선택이고, 멀리 있는 앵커를 욕심내면 호가 길어져 고도를 잃는다.
 *
 * maxRope는 '줄이 이보다 길면 아직 쏘지 않는다'는 기준이다. 진자의 최저점이
 * `앵커y(175) + 줄길이` 라서 줄 길이가 곧 스윙 높이를 결정한다 —
 * 사거리에 들어오는 즉시 쏘면 줄이 가장 길어져(≈350) 호가 옥상선 밑까지 처진다.
 * 전봇대가 좀 더 머리 위에 올 때까지 기다리면 줄이 짧아지고 호가 그만큼 높아진다.
 */
function pickAnchor(s, stage, maxRope) {
  let ahead = null;
  let any = null;
  for (const a of stage.anchors) {
    const hit = simAttach(s, a.x, a.y, stage.anchors);
    if (!hit || hit.anchor !== a) continue; // 겨눈 앵커가 아니라 중간 앵커가 걸리면 제외
    if (hit.L > maxRope) continue;
    if (!any || hit.L < any.L) any = { a, L: hit.L };
    if (a.x > s.x && (!ahead || a.x < ahead.a.x)) ahead = { a, L: hit.L };
  }
  return (ahead ?? any) ?? null;
}

// --- 실제 게임 구동 ---

const canvas = document.getElementById('game-canvas');

function sendPress(screenX, screenY) {
  const r = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new MouseEvent('mousedown', {
    button: 0, bubbles: true,
    clientX: r.left + (screenX / 960) * r.width,
    clientY: r.top + (screenY / 540) * r.height,
  }));
}

function sendRelease() {
  const r = canvas.getBoundingClientRect();
  window.dispatchEvent(new MouseEvent('mouseup', {
    button: 0, bubbles: true,
    clientX: r.left + 0.5 * r.width,
    clientY: r.top + 0.5 * r.height,
  }));
}

/** 지금 발 딛고 있는 지붕과 그 앞 낭떠러지 폭. */
function edgeInfo(s, stage) {
  let cur = null;
  for (const p of stage.platforms) {
    if (Math.abs(s.y + HH - p.y) < 0.5 && s.x + HW >= p.x && s.x - HW <= p.x + p.width) {
      if (!cur || p.x > cur.x) cur = p;
    }
  }
  if (!cur) return null;
  const edge = cur.x + cur.width;
  let next = null;
  for (const p of stage.platforms) {
    if (p.x > edge - 1 && (!next || p.x < next.x)) next = p;
  }
  return { edge, dist: edge - s.x, gapW: next ? next.x - edge : Infinity };
}

/**
 * 자동 플레이 1회. 실제 게임 상태를 매 프레임 읽어 판단하고(폐루프),
 * 실제 __dev.update() 를 밟아 진짜 궤적을 기록한다.
 */
export function play(opts = {}) {
  const d = window.__dev;
  const jumpAt = opts.jumpAt ?? 8;
  // 놓는 각도. theta는 화면 좌표계라 90°가 앵커 바로 아래(호의 최저점)이고,
  // 그보다 작아질수록 앞쪽으로 올라가며 날아가는 방향이 된다.
  const relTheta = (opts.releaseDeg ?? 55) * Math.PI / 180;
  // 줄 길이 상한. 사거리 한계(≈354)를 그대로 쓰면 사거리에 닿는 순간 쏘게 되어 호가 가장 낮다.
  const maxRope = opts.maxRope ?? 354;
  // high: '가장 높이 나는' 계획 탐색을 쓴다 (planHigh). 끄면 단순 정책(빨리 건너기).
  const high = opts.high ?? false;
  d.restart();
  const stage = d.getStage();
  const p = d.player;

  const traj = [];
  const events = [];
  let fireFrame = -1;
  let releaseAt = null;
  let frame = 0;
  const maxFrames = opts.maxFrames ?? 6000;

  for (; frame < maxFrames; frame++) {
    const cur = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, state: p.state, wire: null };

    if (p.state === 'GROUND') {
      const e = edgeInfo(cur, stage);
      if (e && e.gapW !== Infinity && e.dist <= jumpAt) {
        sendPress(480, 270);
        events.push({ frame, type: 'jump', x: Math.round(p.x) });
      }
    } else if (p.state === 'AIR_FREE') {
      // 그냥 날아가서 안전하게 착지한다면 굳이 와이어를 쏘지 않는다
      const o = rollout(cur, stage);
      if (!(o.landed && o.x > cur.x - 5)) {
        if (high) {
          // **최대한 늦게 쏜다.** 전봇대가 머리 위로 올 때까지 기다리면 줄이 짧아지고
          // 진자 최저점(= 앵커y + 줄길이)이 그만큼 높아진다. 갭마다 기다릴 수 있는 한계가
          // 다르므로 줄 길이를 고정값으로 두지 않고, '한 프레임 더 기다려도 건널 수 있는가'를
          // 매 프레임 확인해서 안 되는 순간에 쏜다.
          const plan = planHigh(cur, stage, maxRope);
          if (plan) {
            const ahead = clone(cur);
            step(ahead, stage);
            const canWait = ahead.state === 'AIR_FREE'
              && planHigh(ahead, stage, maxRope, true) !== null;
            if (!canWait) {
              sendPress(plan.a.x - d.getCamera().x, plan.a.y);
              fireFrame = frame;
              releaseAt = frame + plan.r;
              events.push({ frame, type: 'fire', x: Math.round(p.x), y: Math.round(p.y), anchorX: plan.a.x, hold: plan.r, lowest: Math.round(plan.lowest) });
            }
          }
        } else {
          const pick = pickAnchor(cur, stage, maxRope);
          if (pick) {
            sendPress(pick.a.x - d.getCamera().x, pick.a.y);
            fireFrame = frame;
            releaseAt = null;
            events.push({ frame, type: 'fire', x: Math.round(p.x), y: Math.round(p.y), anchorX: pick.a.x, rope: Math.round(pick.L) });
          }
        }
      }
    } else if (p.state === 'AIR_WIRED') {
      const w = d.getWire();
      if (w && frame - fireFrame >= MIN_HOLD) {
        if (high) {
          if (releaseAt !== null && frame >= releaseAt) {
            sendRelease();
            events.push({ frame, type: 'release', x: Math.round(p.x), y: Math.round(p.y), deg: Math.round(w.theta * 180 / Math.PI) });
            releaseAt = null;
          }
        } else {
          // 지금 놓으면 안전하게 건너가는가 (그렇다면 더 끌지 않는다 — 지나치면 오히려 넘어간다)
          const o = rollout({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, state: 'AIR_FREE', wire: null }, stage);
          const safeNow = o.landed && o.x > p.x + 10;
          // 진자가 되돌아오기 시작하면(omega >= 0) 더 기다릴 이유가 없다
          if (safeNow || w.theta <= relTheta || w.omega >= 0) {
            sendRelease();
            events.push({ frame, type: 'release', x: Math.round(p.x), y: Math.round(p.y), deg: Math.round(w.theta * 180 / Math.PI), why: safeNow ? 'safe' : w.omega >= 0 ? 'reverse' : 'angle' });
          }
        }
      }
    }

    d.update(DT);
    traj.push({ f: frame, x: +p.x.toFixed(2), y: +p.y.toFixed(2), s: p.state });

    const gs = d.getGameState();
    if (gs !== 'PLAYING') {
      return { result: gs, frames: frame + 1, traj, events, score: d.getScore(), courseLength: stage.courseLength };
    }
  }
  return { result: 'TIMEOUT', frames: frame, traj, events, score: d.getScore(), courseLength: stage.courseLength };
}

/** 한 번의 플레이를 요약한다. 공중 구간이 얼마나 높이 나는지가 동전 배치의 핵심 지표다. */
function summarize(r, extra) {
  let back = 0;
  for (let i = 1; i < r.traj.length; i++) {
    if (r.traj[i].x < r.traj[i - 1].x) back += r.traj[i - 1].x - r.traj[i].x;
  }
  const airY = r.traj.filter((f) => f.s !== 'GROUND').map((f) => f.y).sort((a, b) => a - b);
  const q = (p) => (airY.length ? Math.round(airY[Math.floor(p * (airY.length - 1))]) : null);
  const ropes = r.events.filter((e) => e.type === 'fire').map((e) => e.rope).sort((a, b) => a - b);
  return {
    ...extra, result: r.result, frames: r.frames,
    endX: Math.round(r.traj[r.traj.length - 1].x),
    back: Math.round(back),
    fires: ropes.length,
    // 공중 y 사분위 (작을수록 높이 난다). 옥상선은 440.
    airY: [q(0), q(0.25), q(0.5), q(0.75), q(1)],
    옥상선아래: r.traj.filter((f) => f.s !== 'GROUND' && f.y > 440).length,
    줄길이중앙: ropes.length ? ropes[Math.floor(ropes.length / 2)] : null,
  };
}

/** 놓는 각도와 줄 길이 상한을 훑어 '완주하면서 가장 높이 나는' 스타일을 찾는다. */
export function sweep(degs = [76, 80, 84, 88], ropes = [354, 320, 290, 260, 230, 200]) {
  const out = [];
  for (const maxRope of ropes) {
    for (const deg of degs) {
      out.push(summarize(play({ releaseDeg: deg, maxRope }), { deg, maxRope }));
    }
  }
  return out;
}

window.__auto = { play, sweep };
