// 코스(지형/탑/동전/목표 지점) 정의와 로드.
//
// CP23 이전까지는 스테이지 1~6이 서로 독립된 판이었다(각자 재시작, 각자 클리어 팝업).
// 사용자 요청으로 '하나로 쭉 이어지는 코스'로 바꿨다: 예전 스테이지들은 이제 코스 중간의
// '와이어 챕터'가 되고, 챕터 사이에는 그냥 달리며 동전만 먹는 '휴식 구간'이 들어간다.
// 추락하면 항상 코스 맨 처음부터 다시 시작하고, 클리어 팝업은 맨 끝 목표에서만 뜬다.
//
// 각 챕터의 갭 폭/탑 간격은 CP22에서 자동 플레이로 완주 가능함을 이미 검증한 값을
// 그대로 재사용한다 — 숫자를 손으로 옮겨 적다 실수하지 않도록, 이어붙이는 계산은
// 아래 buildCourse()가 한다.

import { createAnchor } from './anchor.js';
import { TUNING } from './config.js';

const ROOF_Y = 440;
const ANCHOR_Y = 175;

/**
 * 휴식 구간(그냥 달리며 동전만 먹는 구간) 하나는 '평지 - 점프갭 - 평지' 3부분으로 이루어진다.
 * 사용자 요청으로 기존 420px의 3배(1260px)로 늘렸다.
 *
 * 중간의 점프갭(REST_JUMP_GAP)은 와이어 없이 지상 고정 점프만으로 건너는 구간이다.
 * 처음에 130px로 뒀다가 실제로 재봤더니 문제가 있었다: 점프의 체공 시간(2×650/1400≈0.929초)이
 * 고정이라, 너무 일찍 뛰면 갭 한가운데 상공에서 이미 지상 높이로 되돌아와 버려 그대로
 * 떨어진다. 130px 갭은 '가장자리 앞 50px 안에서 뛰어야만' 성공하는 좁은 타이밍이었다 —
 * "그냥 단순하게 뛰는 구간"이라는 취지와 안 맞는다. 갭을 80px로 줄이면 가장 느린 구간
 * (배율×1.0, 오토런 180px/s → 사거리 0.929×180≈167px) 기준으로도 허용 타이밍 폭이
 * 100px(≈0.55초)까지 넓어져, 지붕 끝 근처 아무 데서나 눌러도 여유 있게 건너진다.
 */
const REST_FLAT = 560;
const REST_JUMP_GAP = 80;
const REST_TOTAL_WIDTH = REST_FLAT * 2 + REST_JUMP_GAP; // 1200 (요청한 3배인 1260에 근접)

/**
 * 챕터 정의. 각 챕터는 갭(들)로만 이루어지고, 갭 사이에 섬(island)이 있을 수도 있다.
 * anchors의 dx는 '그 갭의 시작'을 기준으로 한 오프셋 — CP22의 원래 스테이지에서 그대로 가져왔다.
 * coins의 dx도 같은 기준(그 챕터 첫 갭의 시작)의 오프셋이다.
 */
const CHAPTERS = [
  {
    // 예전 스테이지 1
    gaps: [{ width: 500, anchorOffsets: [80, 230, 370] }],
    coins: [
      { dx: 30, y: 347, type: 'silver' },
      { dx: 140, y: 347, type: 'silver' },
      { dx: 210, y: 277, type: 'gold' },
      { dx: 210, y: 326, type: 'silver', newGroup: true },
      { dx: 260, y: 314, type: 'silver' },
      { dx: 400, y: 300, type: 'silver', newGroup: true },
      { dx: 460, y: 288, type: 'gold' },
    ],
  },
  {
    // 예전 스테이지 2
    gaps: [{ width: 650, anchorOffsets: [80, 230, 370, 520] }],
    coins: [
      { dx: 30, y: 348, type: 'silver' },
      { dx: 140, y: 347, type: 'silver' },
      { dx: 290, y: 300, type: 'silver', newGroup: true },
      { dx: 430, y: 290, type: 'gold', newGroup: true },
      { dx: 600, y: 300, type: 'silver', newGroup: true },
    ],
  },
  {
    // 예전 스테이지 3
    gaps: [{ width: 800, anchorOffsets: [80, 230, 370, 520, 670] }],
    coins: [
      { dx: 140, y: 347, type: 'silver' },
      { dx: 290, y: 300, type: 'silver', newGroup: true },
      { dx: 430, y: 290, type: 'gold', newGroup: true },
      { dx: 580, y: 300, type: 'silver', newGroup: true },
      { dx: 750, y: 300, type: 'silver', newGroup: true },
    ],
  },
  {
    // 예전 스테이지 4 — 중간 섬 하나를 두고 두 번 건넌다.
    gaps: [
      { width: 500, anchorOffsets: [80, 230, 380] },
      { island: 140 },
      { width: 500, anchorOffsets: [80, 230, 380] },
    ],
    coins: [
      { dx: 190, y: 347, type: 'silver' },
      { dx: 340, y: 300, type: 'gold', newGroup: true },
      { dx: 560, y: 405, type: 'silver', newGroup: true }, // 중간 섬 위
      { dx: 780, y: 347, type: 'silver', newGroup: true },
      { dx: 930, y: 300, type: 'silver' },
      { dx: 1080, y: 290, type: 'gold', newGroup: true },
    ],
  },
  {
    // 예전 스테이지 5
    gaps: [{ width: 950, anchorOffsets: [80, 230, 370, 520, 670, 820] }],
    coins: [
      { dx: 140, y: 347, type: 'silver' },
      { dx: 290, y: 300, type: 'silver', newGroup: true },
      { dx: 430, y: 290, type: 'gold', newGroup: true },
      { dx: 580, y: 300, type: 'silver', newGroup: true },
      { dx: 730, y: 300, type: 'silver', newGroup: true },
      { dx: 890, y: 290, type: 'gold', newGroup: true },
    ],
  },
  {
    // 예전 스테이지 6 — 가장 긴 체인(4연속)을 가장 빠른 속도로.
    gaps: [
      { width: 500, anchorOffsets: [80, 230, 380] },
      { island: 120 },
      { width: 700, anchorOffsets: [80, 230, 380, 530] },
    ],
    coins: [
      { dx: 190, y: 347, type: 'silver' },
      { dx: 340, y: 290, type: 'gold', newGroup: true },
      { dx: 540, y: 385, type: 'silver', newGroup: true }, // 중간 섬 위
      { dx: 740, y: 347, type: 'silver', newGroup: true },
      { dx: 890, y: 300, type: 'silver' },
      { dx: 1040, y: 290, type: 'silver', newGroup: true },
      { dx: 1190, y: 290, type: 'gold', newGroup: true },
    ],
  },
];

/**
 * 휴식 구간 하나(평지-점프갭-평지)를 cursor 위치에 만들어 붙인다.
 * 두 평지 모두에 '그냥 달리면서' 먹는 동전을 채우고, 점프갭 너머 착지 지점에도
 * 하나 놓아서 방금 넘어온 점프를 눈으로 확인시켜준다.
 *
 * 와이어 없이도 100% 확실히 먹히므로, 여기서는 퍼펙트 보너스가 쉬어가는 보상처럼 주어진다.
 *
 * @returns {{roofs, coins, endCursor}}
 */
function buildRestSection(cursor, group) {
  const roofs = [{ x: cursor, width: REST_FLAT }];
  const secondStart = cursor + REST_FLAT + REST_JUMP_GAP;
  roofs.push({ x: secondStart, width: REST_FLAT });

  const coins = [];
  const ys = [410, 400, 405, 410, 405, 410];
  // 첫 번째 평지: 4개
  for (let i = 0; i < 4; i++) {
    coins.push({ x: cursor + 60 + i * 110, y: ys[i], group, type: 'silver' });
  }
  // 점프갭을 넘어온 직후 + 두 번째 평지: 4개 (착지 지점 바로 다음부터)
  for (let i = 0; i < 4; i++) {
    coins.push({ x: secondStart + 40 + i * 110, y: ys[i + 2], group, type: 'silver' });
  }

  return { roofs, coins, endCursor: secondStart + REST_FLAT };
}

/** 챕터/휴식 구간을 이어 붙여 하나의 코스를 만든다. */
function buildCourse() {
  const anchors = [];
  const coins = [];
  let group = 0;

  // 코스 시작 휴식 구간 — 스폰 직후 가볍게 뛰며 먹는 동전 + 와이어 없이 넘는 첫 점프갭.
  group += 1;
  const intro = buildRestSection(0, group);
  const roofs = intro.roofs;
  coins.push(...intro.coins);
  let cursor = intro.endCursor;

  let lastRestStart = 0;

  CHAPTERS.forEach((chapter) => {
    const chapterGapStart = cursor;
    group += 1;

    for (const gap of chapter.gaps) {
      if (gap.island) {
        roofs.push({ x: cursor, width: gap.island });
        cursor += gap.island;
        continue;
      }
      const gapStart = cursor;
      for (const off of gap.anchorOffsets) {
        anchors.push({ x: gapStart + off, y: ANCHOR_Y });
      }
      cursor += gap.width;
    }

    // 챕터의 스윙/궤적 동전
    for (const c of chapter.coins) {
      if (c.newGroup) group += 1;
      coins.push({ x: chapterGapStart + c.dx, y: c.y, group, type: c.type });
    }

    // 챕터의 랜딩 = 휴식 구간(평지-점프갭-평지). 곧바로 이어 붙인다.
    group += 1;
    lastRestStart = cursor;
    const rest = buildRestSection(cursor, group);
    roofs.push(...rest.roofs);
    coins.push(...rest.coins);
    cursor = rest.endCursor;
  });

  // 목표 지점은 마지막 휴식 구간의 첫 평지 위, 시작에서 조금 들어간 자리.
  const goal = { x: lastRestStart + 50, y: ROOF_Y };
  const courseLength = cursor;

  return { roofs, anchors, coins, goal, courseLength };
}

const COURSE = buildCourse();

/** 코스 끝에서의 속도 배율. 시작은 항상 1.0. */
const MAX_SPEED_SCALE = 1.6;

export const STAGES = [
  {
    id: 1,
    name: '옥상 위 고군분투!',
    roofY: ROOF_Y,
    spawn: { x: 80, y: 423 },
    roofs: COURSE.roofs,
    anchors: COURSE.anchors,
    coins: COURSE.coins,
    goal: COURSE.goal,
    courseLength: COURSE.courseLength,
  },
];

export const STAGE_COUNT = STAGES.length;

/**
 * 스테이지를 실행용 형태로 펼쳐서 돌려준다.
 * 매번 새 객체를 만든다 — 재시작할 때 이전 판에서 먹은 동전 같은 상태가 남으면 안 된다.
 *
 * @param {number} index 0부터 시작하는 스테이지 번호
 */
export function loadStage(index) {
  const def = STAGES[index];
  if (!def) throw new Error(`스테이지 ${index} 없음`);

  const platforms = def.roofs.map((r) => ({
    x: r.x,
    y: r.y ?? def.roofY,
    width: r.width,
  }));

  return {
    index,
    id: def.id,
    name: def.name,
    spawn: { ...def.spawn },
    platforms,
    anchors: def.anchors.map((a) => createAnchor(a.x, a.y, a.height)),
    coins: def.coins.map((c) => ({ ...c, taken: false })),
    goal: { ...def.goal },
    courseLength: def.courseLength,

    /**
     * 진행 거리 기반 속도 배율. 예전에는 스테이지 번호로 계단식으로 올렸지만,
     * 이제 스테이지가 하나로 이어졌으므로 '코스 진행률'로 매끄럽게 올린다.
     * @param {number} x 캐릭터의 현재 월드 x
     */
    speedScaleAt(x) {
      const t = Math.max(0, Math.min(1, x / def.courseLength));
      return 1 + (MAX_SPEED_SCALE - 1) * t;
    },

    // 낭떠러지(어두운 심연)가 시작되는 높이.
    // 가장 낮은 지붕 표면을 기준으로 잡아야, 높이가 다른 지붕이 섞여도
    // 하늘이어야 할 곳을 어둡게 덮지 않는다.
    abyssTop: Math.max(...platforms.map((p) => p.y)),
  };
}
