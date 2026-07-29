// 탑(앵커) — 낭떠러지 중간에 떠 있는, 와이어를 걸 수 있는 지점.

/**
 * 탑을 생성한다.
 * x, y는 와이어가 실제로 걸리는 '고리'의 중심이며, 진자 운동의 회전축이 된다.
 *
 * 부착 판정 반경은 탑마다 저장하지 않고 TUNING.ANCHOR_RADIUS를 그때그때 읽는다 —
 * 튜닝 패널에서 값을 바꿨을 때 이미 만들어진 탑에도 즉시 반영되어야 하기 때문.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} [height] 고리 아래로 뻗은 탑 몸통의 길이 (그리기용)
 */
export function createAnchor(x, y, height = 70) {
  return { x, y, height };
}
