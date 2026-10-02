import { randomDieValue } from '../lib/local/dice';
import { vi, describe, it, expect, afterEach } from 'vitest';

describe('randomDieValue', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws an error if crypto is not available', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => randomDieValue(6)).toThrow(
      'Secure random number generation is not supported in this environment'
    );
  });

  it('throws an error if getRandomValues is not a function', () => {
    vi.stubGlobal('crypto', { getRandomValues: null });
    expect(() => randomDieValue(6)).toThrow(
      'Secure random number generation is not supported in this environment'
    );
  });

  it('returns a value between 1 and sides inclusive', () => {
    // Mock getRandomValues to return a specific value
    vi.stubGlobal('crypto', {
      getRandomValues: (buf: Uint32Array) => {
        buf[0] = 5; // Will return 6 for d6 (5 % 6 + 1)
        return buf;
      },
    });
    expect(randomDieValue(6)).toBe(6);
  });

  it('rejects values above the limit to ensure unbiased results', () => {
    const sides = 6;
    const limit = Math.floor(0x1_0000_0000 / sides) * sides; // 4294967292
    let callCount = 0;

    vi.stubGlobal('crypto', {
      getRandomValues: (buf: Uint32Array) => {
        if (callCount === 0) {
          buf[0] = limit; // First call: reject this value
        } else {
          buf[0] = limit - 1; // Second call: accept this value
        }
        callCount++;
        return buf;
      },
    });

    expect(randomDieValue(sides)).toBe(((limit - 1) % sides) + 1);
    expect(callCount).toBe(2);
  });
});
