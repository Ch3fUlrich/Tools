import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { rollDiceLocal, saveDiceRollLocal, getDiceHistoryLocal, randomDieValue } from '../lib/local/dice';

describe('rollDiceLocal', () => {
  let getRandomValuesSpy: any;

  beforeEach(() => {
    localStorage.clear();
    if (globalThis.crypto) {
      getRandomValuesSpy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr: any) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = 1; // 1 % sides = 1, so outcome is 2
        }
        return arr;
      });
    }
  });

  afterEach(() => {
    if (getRandomValuesSpy) {
      getRandomValuesSpy.mockRestore();
    }
    vi.restoreAllMocks();
  });

  it('rolls a single request', () => {
    const request = { count: 1, die: { type: 'd6' as const } };
    const response = rollDiceLocal(request);

    expect(response.rolls.length).toBe(1);
    expect(response.summary.totalRollsRequested).toBe(1);
    expect(response.rolls[0].used.length).toBe(1);
    expect(response.rolls[0].used[0]).toBe(2);
  });

  it('handles median calculation correctly (even number of elements)', () => {
    if (getRandomValuesSpy) getRandomValuesSpy.mockRestore();

    let callCount = 0;
    getRandomValuesSpy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr: any) => {
      callCount++;
      // Return 0, 1, 2, 3 so values are 1, 2, 3, 4
      arr[0] = callCount - 1;
      return arr;
    });

    const request = { count: 4, die: { type: 'd6' as const } };
    const response = rollDiceLocal(request);

    // Values are [1, 2, 3, 4], median is (2 + 3) / 2 = 2.5
    expect(response.rolls[0].median).toBe(2.5);
    expect(response.rolls[0].spread).toBe(3); // 4 - 1
  });

  it('handles randomDieValue rejecting out-of-bounds values', () => {
    if (getRandomValuesSpy) getRandomValuesSpy.mockRestore();

    // d6 sides=6. max value limit = Math.floor(0x100000000 / 6) * 6 = 715827882 * 6 = 4294967292
    // Value >= 4294967292 is rejected. We provide one rejected value, then a valid one.
    let callCount = 0;
    getRandomValuesSpy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr: any) => {
      callCount++;
      if (callCount === 1) {
        arr[0] = 0xFFFFFFFF; // Rejected
      } else {
        arr[0] = 0; // Accepted, value 1
      }
      return arr;
    });

    const val = randomDieValue(6);
    expect(val).toBe(1);
    expect(callCount).toBe(2);
  });

  it('handles an array of requests', () => {
    const requests = [
      { count: 1, die: { type: 'd6' as const } },
      { count: 2, die: { type: 'd20' as const } }
    ];
    const response = rollDiceLocal(requests as any);

    expect(response.rolls.length).toBe(2);
    expect(response.summary.totalRollsRequested).toBe(2);
    expect(response.rolls[0].used.length).toBe(1);
    expect(response.rolls[1].used.length).toBe(2);
  });

  it('handles custom die type', () => {
    const request = { count: 1, die: { type: 'custom' as const, sides: 10 } };
    const response = rollDiceLocal(request);
    expect(response.rolls[0].used[0]).toBe(2);
  });

  it('handles missing custom sides falling back to 6', () => {
    const request = { count: 1, die: { type: 'custom' as const } };
    const response = rollDiceLocal(request);
    expect(response.rolls[0].used[0]).toBe(2);
  });

  it('handles rerolls (mode: lt)', () => {
    if (getRandomValuesSpy) getRandomValuesSpy.mockRestore();

    let callCount = 0;
    getRandomValuesSpy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr: any) => {
      callCount++;
      arr[0] = callCount === 1 ? 0 : 3; // 0%6=0->1, 3%6=3->4
      return arr;
    });

    const request = {
      count: 1,
      die: { type: 'd6' as const },
      reroll: { mode: 'lt' as const, threshold: 3 }
    };
    const response = rollDiceLocal(request);

    expect(response.rolls[0].used[0]).toBe(4);
    expect(response.rolls[0].perDie[0].original).toEqual([1, 4]);
  });

  it('handles rerolls (mode: gt)', () => {
    if (getRandomValuesSpy) getRandomValuesSpy.mockRestore();

    let callCount = 0;
    getRandomValuesSpy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr: any) => {
      callCount++;
      arr[0] = callCount === 1 ? 4 : 1; // 4%6=4->5, 1%6=1->2
      return arr;
    });

    const request = {
      count: 1,
      die: { type: 'd6' as const },
      reroll: { mode: 'gt' as const, threshold: 4 }
    };
    const response = rollDiceLocal(request);

    expect(response.rolls[0].used[0]).toBe(2);
    expect(response.rolls[0].perDie[0].original).toEqual([5, 2]);
  });

  it('handles rerolls with invalid mode gracefully (ignores)', () => {
    if (getRandomValuesSpy) getRandomValuesSpy.mockRestore();

    let callCount = 0;
    getRandomValuesSpy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr: any) => {
      callCount++;
      arr[0] = callCount === 1 ? 0 : 3; // 0%6=0->1
      return arr;
    });

    const request = {
      count: 1,
      die: { type: 'd6' as const },
      reroll: { mode: 'invalid' as any, threshold: 3 }
    };
    const response = rollDiceLocal(request);

    expect(response.rolls[0].used[0]).toBe(1); // should not reroll
  });

  it('handles advantage mode: per-die adv', () => {
    if (getRandomValuesSpy) getRandomValuesSpy.mockRestore();

    let callCount = 0;
    getRandomValuesSpy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr: any) => {
      callCount++;
      arr[0] = callCount === 1 ? 1 : 4;
      return arr;
    });

    const request = {
      count: 1,
      die: { type: 'd6' as const },
      advantage: 'adv' as const,
      advantageMode: 'per-die' as const
    };
    const response = rollDiceLocal(request);

    expect(response.rolls[0].used[0]).toBe(5);
  });

  it('handles advantage mode: per-die dis', () => {
    if (getRandomValuesSpy) getRandomValuesSpy.mockRestore();

    let callCount = 0;
    getRandomValuesSpy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr: any) => {
      callCount++;
      arr[0] = callCount === 1 ? 1 : 4;
      return arr;
    });

    const request = {
      count: 1,
      die: { type: 'd6' as const },
      advantage: 'dis' as const,
      advantageMode: 'per-die' as const
    };
    const response = rollDiceLocal(request);

    expect(response.rolls[0].used[0]).toBe(2);
  });

  it('handles advantage mode: per-set adv', () => {
    if (getRandomValuesSpy) getRandomValuesSpy.mockRestore();

    let callCount = 0;
    getRandomValuesSpy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr: any) => {
      callCount++;
      arr[0] = callCount <= 2 ? 1 : 4;
      return arr;
    });

    const request = {
      count: 2,
      die: { type: 'd6' as const },
      advantage: 'adv' as const,
      advantageMode: 'per-set' as const
    };
    const response = rollDiceLocal(request);

    expect(response.rolls[0].sum).toBe(10);
  });

  it('handles advantage mode: per-set dis', () => {
    if (getRandomValuesSpy) getRandomValuesSpy.mockRestore();

    let callCount = 0;
    getRandomValuesSpy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr: any) => {
      callCount++;
      arr[0] = callCount <= 2 ? 1 : 4;
      return arr;
    });

    const request = {
      count: 2,
      die: { type: 'd6' as const },
      advantage: 'dis' as const,
      advantageMode: 'per-set' as const
    };
    const response = rollDiceLocal(request);

    expect(response.rolls[0].sum).toBe(4);
  });

  it('throws on missing or negative count', () => {
    expect(() => rollDiceLocal({ count: 0, die: { type: 'd6' as const } } as any)).toThrow('count must be > 0');
    expect(() => rollDiceLocal({ count: -1, die: { type: 'd6' as const } })).toThrow('count must be > 0');
    expect(() => rollDiceLocal({ count: 1000, die: { type: 'd6' as const } })).toThrow('count exceeds max allowed');
  });

  it('throws on unknown die type', () => {
    expect(() => rollDiceLocal({ count: 1, die: { type: 'unknown' } as any })).toThrow('unknown die type');
  });

  it('throws on sides exceeding max allowed', () => {
    expect(() => rollDiceLocal({ count: 1, die: { type: 'custom', sides: 10001 } as any })).toThrow('sides exceeds max allowed');
  });

  it('throws when rolls exceeds max independent rolls', () => {
    expect(() => rollDiceLocal({ count: 1, die: { type: 'd6' as const }, rolls: 101 })).toThrow('too many independent rolls requested');
  });

  it('throws if crypto is missing', () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });

    expect(() => rollDiceLocal({ count: 1, die: { type: 'd6' as const } })).toThrow('Secure random number generation is not supported in this environment');

    Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true });
  });

  it('throws if crypto.getRandomValues is missing', () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });

    expect(() => rollDiceLocal({ count: 1, die: { type: 'd6' as const } })).toThrow('Secure random number generation is not supported in this environment');

    Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true });
  });

  it('tests saving and getting dice history (localStorage)', () => {
    saveDiceRollLocal({ test: 'payload' });
    const history = getDiceHistoryLocal();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].payload).toEqual({ test: 'payload' });
  });

  it('handles invalid JSON in localStorage gracefully', () => {
    localStorage.setItem('tools:diceHistory', '{invalid}');
    expect(getDiceHistoryLocal()).toEqual([]);
  });

  it('caps history at 100 items', () => {
    for (let i = 0; i < 105; i++) {
      saveDiceRollLocal({ i });
    }
    const history = getDiceHistoryLocal();
    expect(history.length).toBe(100);
    expect(history[0].payload).toEqual({ i: 104 });
  });

  it('handles localStorage errors gracefully in saveDiceRollLocal', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('Quota exceeded');
    });
    expect(() => saveDiceRollLocal({ test: 'payload' })).not.toThrow();
    setItemSpy.mockRestore();
  });

  it('handles localStorage errors gracefully in getDiceHistoryLocal', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new Error('Access denied');
    });
    expect(getDiceHistoryLocal()).toEqual([]);
    getItemSpy.mockRestore();
  });
});
