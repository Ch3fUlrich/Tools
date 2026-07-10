// Compute exact probability distribution for numDice×sides using dynamic programming
export function computeSumDist(numDice: number, sides: number): Map<number, number> {
  let dist = new Map<number, number>([[0, 1]]);
  for (let d = 0; d < numDice; d++) {
    const next = new Map<number, number>();
    for (const [s, w] of dist) {
      for (let f = 1; f <= sides; f++) {
        const ns = s + f;
        next.set(ns, (next.get(ns) ?? 0) + w);
      }
    }
    dist = next;
  }
  return dist;
}

// Compute set of sums achievable using only non-rerollable face values (for prob chart graying)
export function computeCleanSums(numDice: number, sides: number, isRerollable: (v: number) => boolean): Set<number> {
  const cleanFaces: number[] = [];
  for (let f = 1; f <= sides; f++) {
    if (!isRerollable(f)) cleanFaces.push(f);
  }
  if (cleanFaces.length === 0) return new Set();
  let sums = new Set<number>([0]);
  for (let d = 0; d < numDice; d++) {
    const next = new Set<number>();
    for (const s of sums) {
      for (const f of cleanFaces) {
        next.add(s + f);
      }
    }
    sums = next;
  }
  return sums;
}
