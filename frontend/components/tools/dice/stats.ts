const distCache = new Map<string, Map<number, number>>();

// Compute exact probability distribution for numDice×sides using dynamic programming
export function computeSumDist(
  numDice: number,
  sides: number
): Map<number, number> {
  const key = `${numDice},${sides}`;
  if (distCache.has(key)) {
    return distCache.get(key)!;
  }

  let distArray = new Float64Array(1);
  distArray[0] = 1;

  for (let d = 0; d < numDice; d++) {
    const nextSize = (d + 1) * sides + 1;
    const nextArray = new Float64Array(nextSize);
    for (let s = 0; s < distArray.length; s++) {
      const w = distArray[s];
      if (w === 0) continue;
      for (let f = 1; f <= sides; f++) {
        nextArray[s + f] += w;
      }
    }
    distArray = nextArray;
  }

  const dist = new Map<number, number>();
  for (let i = 0; i < distArray.length; i++) {
    if (distArray[i] > 0) {
      dist.set(i, distArray[i]);
    }
  }

  distCache.set(key, dist);
  return dist;
}

// Compute set of sums achievable using only non-rerollable face values (for prob chart graying)
export function computeCleanSums(
  numDice: number,
  sides: number,
  isRerollable: (v: number) => boolean
): Set<number> {
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
