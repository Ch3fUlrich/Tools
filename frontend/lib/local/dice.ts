// Client-side dice rolling — mirrors backend/src/tools/dice.rs (validation,
// limits, advantage modes, rerolls, stats) so offline rolls behave the same.
// Uses the Web Crypto CSPRNG with rejection sampling for unbiased results.
import type { DiceRequest, DiceResponse, DiceRollResult, PerDieDetail } from '@/lib/types/dice';

const MAX_DICE = 1000;
const MAX_SIDES = 10000;
const MAX_REROLLS_PER_DIE = 1000;
const MAX_INDEPENDENT_ROLLS = 100;

const DIE_SIDES: Record<string, number> = {
  d2: 2,
  d3: 3,
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
};

/** Unbiased random integer in [1, sides] via CSPRNG rejection sampling. */
function randomDieValue(sides: number): number {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    // Largest multiple of `sides` below 2^32 — reject values above it.
    const limit = Math.floor(0x1_0000_0000 / sides) * sides;
    const buf = new Uint32Array(1);
    let x: number;
    do {
      cryptoObj.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return 1 + (x % sides);
  }
  // Environments without Web Crypto (old test runners) — non-cryptographic fallback.
  return 1 + Math.floor(Math.random() * sides);
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid] + sorted[mid - 1]) / 2;
}

function buildStats(perDie: PerDieDetail[], used: number[]): DiceRollResult {
  const sum = used.reduce((a, b) => a + b, 0);
  const average = used.length === 0 ? 0 : sum / used.length;
  const sorted = [...used].sort((a, b) => a - b);
  const spread = sorted.length === 0 ? 0 : sorted[sorted.length - 1] - sorted[0];
  return { perDie, used, sum, average, median: median(sorted), spread };
}

export function rollDiceLocal(request: DiceRequest): DiceResponse {
  if (!request.count || request.count <= 0) {
    throw new Error('count must be > 0');
  }
  if (request.count >= MAX_DICE) {
    throw new Error('count exceeds max allowed');
  }

  let sides: number;
  if (request.die.type === 'custom') {
    sides = request.die.sides ?? 6;
  } else if (DIE_SIDES[request.die.type]) {
    sides = DIE_SIDES[request.die.type];
  } else {
    throw new Error('unknown die type');
  }
  if (sides > MAX_SIDES) {
    throw new Error('sides exceeds max allowed');
  }

  const rolls = request.rolls ?? 1;
  if (rolls > MAX_INDEPENDENT_ROLLS) {
    throw new Error('too many independent rolls requested');
  }

  const maxRerolls = Math.min(request.maxRerollsPerDie ?? 10, MAX_REROLLS_PER_DIE);

  const estWork = request.count * (maxRerolls + 1) * rolls;
  const safeThreshold = MAX_DICE * (MAX_REROLLS_PER_DIE + 1) * MAX_INDEPENDENT_ROLLS;
  if (estWork >= safeThreshold) {
    throw new Error('request too large; exceeds server cost limits');
  }

  const rollWithRerolls = (): { originals: number[]; final: number } => {
    const originals: number[] = [];
    let value = randomDieValue(sides);
    originals.push(value);
    if (request.reroll) {
      const { mode, threshold } = request.reroll;
      const effectiveMax = request.reroll.maxRerolls ?? maxRerolls;
      let tries = 0;
      for (;;) {
        const should = mode === 'lt' ? value <= threshold : mode === 'gt' ? value >= threshold : false;
        if (!should || tries >= effectiveMax) break;
        value = randomDieValue(sides);
        originals.push(value);
        tries += 1;
      }
    }
    return { originals, final: value };
  };

  const performSet = (): { perDie: PerDieDetail[]; used: number[] } => {
    const perDie: PerDieDetail[] = [];
    const used: number[] = [];
    for (let i = 0; i < request.count; i++) {
      const { originals, final } = rollWithRerolls();
      perDie.push({ original: originals, final });
      used.push(final);
    }
    return { perDie, used };
  };

  const advantage = request.advantage ?? 'none';
  const advMode = request.advantageMode ?? 'per-die';
  const results: DiceRollResult[] = [];

  for (let r = 0; r < rolls; r++) {
    if (advantage === 'none' || advMode === 'per-die') {
      const perDie: PerDieDetail[] = [];
      const used: number[] = [];
      for (let i = 0; i < request.count; i++) {
        if (advantage === 'none') {
          const { originals, final } = rollWithRerolls();
          perDie.push({ original: originals, final });
          used.push(final);
        } else {
          const first = rollWithRerolls();
          const second = rollWithRerolls();
          const chosen =
            advantage === 'adv'
              ? Math.max(first.final, second.final)
              : Math.min(first.final, second.final);
          perDie.push({ original: [...first.originals, ...second.originals], final: chosen });
          used.push(chosen);
        }
      }
      results.push(buildStats(perDie, used));
    } else {
      const set1 = performSet();
      const set2 = performSet();
      const sum1 = set1.used.reduce((a, b) => a + b, 0);
      const sum2 = set2.used.reduce((a, b) => a + b, 0);
      const pickFirst = advantage === 'adv' ? sum1 >= sum2 : sum1 <= sum2;
      const picked = pickFirst ? set1 : set2;
      results.push(buildStats(picked.perDie, picked.used));
    }
  }

  return { rolls: results, summary: { totalRollsRequested: rolls } };
}
