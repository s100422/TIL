// 동전 획득 판정.
// 그리기는 renderer.js가, 배치는 stage.js 데이터가 담당한다.

export const COIN_RADIUS = 11;

/**
 * 종류별 점수.
 * 스코어 세부 공식은 아직 확정 전(CLAUDE.md 미정 사항)이라 임시값이다.
 */
export const COIN_VALUE = {
  silver: 10,
  gold: 50,
};

/**
 * 캐릭터가 닿은 동전을 먹는다. 먹은 동전은 taken 표시가 되고 다시 먹히지 않는다.
 *
 * 캐릭터를 반지름 15의 원으로 어림해서 판정한다 —
 * 사각형으로 딱 맞게 재면 빠르게 지나갈 때 "스쳤는데 안 먹혔다"는 느낌이 남는다.
 * 최고 속도(약 870px/s)에서도 프레임당 15px 남짓 움직이므로 판정 반경(26px)을
 * 건너뛰어 지나칠 일은 없다.
 *
 * @param {object} player
 * @param {Array} coins stage.coins
 * @returns {{gained:number, picked:Array}} 이번 프레임에 얻은 점수와 먹은 동전들
 */
export function collectCoins(player, coins) {
  const reach = COIN_RADIUS + 15;
  let gained = 0;
  const picked = [];

  for (const c of coins) {
    if (c.taken) continue;
    if (Math.hypot(c.x - player.x, c.y - player.y) > reach) continue;

    c.taken = true;
    gained += COIN_VALUE[c.type] ?? COIN_VALUE.silver;
    picked.push(c);
  }

  return { gained, picked };
}

/** 스테이지의 전체 동전 수와 먹은 수. */
export function coinProgress(coins) {
  const taken = coins.filter((c) => c.taken).length;
  return { taken, total: coins.length };
}

/**
 * 한 구간(group)의 동전을 전부 모았을 때 주는 보너스.
 * 스코어 세부 공식은 아직 확정 전이라 임시값 — 금화 두 개 값어치로 잡았다.
 */
export const PERFECT_BONUS = 100;

/** 구간별 동전 수와 먹은 수를 센다. */
export function groupProgress(coins) {
  const groups = new Map();
  for (const c of coins) {
    if (!groups.has(c.group)) groups.set(c.group, { total: 0, taken: 0 });
    const g = groups.get(c.group);
    g.total += 1;
    if (c.taken) g.taken += 1;
  }
  return groups;
}

/**
 * 이번 프레임에 '새로' 완성된 구간을 찾아 보너스를 계산한다.
 *
 * awarded로 이미 지급한 구간을 기억하는 이유:
 * 구간이 한 번 완성되면 그 상태가 계속 유지되므로, 기록하지 않으면
 * 매 프레임 보너스를 다시 지급해 점수가 무한히 오른다.
 *
 * @param {Array} coins stage.coins
 * @param {Set<number>} awarded 이미 보너스를 지급한 구간 번호 (호출 중 갱신된다)
 * @returns {{completed:Array<{group:number,count:number}>, bonus:number}}
 */
export function checkPerfectGroups(coins, awarded) {
  const completed = [];

  for (const [id, g] of groupProgress(coins)) {
    if (g.taken === g.total && !awarded.has(id)) {
      awarded.add(id);
      completed.push({ group: id, count: g.total });
    }
  }

  return { completed, bonus: completed.length * PERFECT_BONUS };
}
