import { describe, it, expect } from 'vitest';
import { amountFirstOrder } from '@/lib/local/pharmacokinetics';

describe('pharmacokinetics - amountFirstOrder', () => {
  it('returns 0 for negative time', () => {
    expect(amountFirstOrder(100, 2, 1, -1)).toBe(0);
    expect(amountFirstOrder(100, 2, 1, -0.1)).toBe(0);
  });

  it('handles the intravenous case (ka is infinite)', () => {
    const dose = 100;
    const ke = 0.5;

    // At t=0, it should be the full dose
    expect(amountFirstOrder(dose, Infinity, ke, 0)).toBe(dose);

    // At t=2, it should decay by e^(-ke * t)
    expect(amountFirstOrder(dose, Infinity, ke, 2)).toBeCloseTo(dose * Math.exp(-ke * 2));

    // At t=10, more decay
    expect(amountFirstOrder(dose, Infinity, ke, 10)).toBeCloseTo(dose * Math.exp(-ke * 10));
  });

  it('handles the singularity when ka == ke', () => {
    const dose = 100;
    const k = 0.5;

    // t=0 should be 0 (no absorption yet)
    expect(amountFirstOrder(dose, k, k, 0)).toBe(0);

    // t=2
    // formula: F * D * k * t * e^(-k * t)
    const expected = dose * k * 2 * Math.exp(-k * 2);
    expect(amountFirstOrder(dose, k, k, 2)).toBeCloseTo(expected);

    // Also tests the epsilon comparison
    expect(amountFirstOrder(dose, k + 1e-10, k, 2)).toBeCloseTo(expected);
  });

  it('calculates correctly for normal first-order kinetics (ka > ke)', () => {
    const dose = 100;
    const ka = 2.0; // Fast absorption
    const ke = 0.1; // Slow elimination

    // t=0 should be 0
    expect(amountFirstOrder(dose, ka, ke, 0)).toBe(0);

    // t=1
    const expectedT1 = (dose * ka) / (ka - ke) * (Math.exp(-ke * 1) - Math.exp(-ka * 1));
    expect(amountFirstOrder(dose, ka, ke, 1)).toBeCloseTo(expectedT1);

    // t=10
    const expectedT10 = (dose * ka) / (ka - ke) * (Math.exp(-ke * 10) - Math.exp(-ka * 10));
    expect(amountFirstOrder(dose, ka, ke, 10)).toBeCloseTo(expectedT10);
  });

  it('calculates correctly when ka < ke', () => {
    const dose = 100;
    const ka = 0.1; // Slow absorption
    const ke = 2.0; // Fast elimination

    // t=0 should be 0
    expect(amountFirstOrder(dose, ka, ke, 0)).toBe(0);

    // t=1
    const expectedT1 = (dose * ka) / (ka - ke) * (Math.exp(-ke * 1) - Math.exp(-ka * 1));
    expect(amountFirstOrder(dose, ka, ke, 1)).toBeCloseTo(expectedT1);
  });

  it('clips small negative values to 0 due to float inaccuracies', () => {
    const result = amountFirstOrder(100, 1, 0.5, 1000);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
