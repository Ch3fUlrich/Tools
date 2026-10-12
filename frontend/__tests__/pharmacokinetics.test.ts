import { describe, it, expect } from 'vitest';
import { amountFirstOrder, resolveRoute, SubstancePk } from '@/lib/local/pharmacokinetics';

const mockSubstance: SubstancePk = {
  id: 'mock-substance',
  name: 'Mock Substance',
  description: 'A mock substance for testing',
  category: 'Test',
  halfLifeHours: 5,
  elimination: 'first-order',
  commonDosageMg: 100,
  maxDailyDoseMg: 500,
  eliminationRoute: 'hepatic',
  sources: [],
  food: {
    tmaxFactor: 1.5, // Food delays absorption by 50%
    bioavailabilityFactor: 0.8, // Food reduces AUC by 20%
  },
  routes: {
    oral: {
      bioavailabilityPercent: 50,
      tmaxHours: 2,
    },
    intravenous: {
      bioavailabilityPercent: 100,
      tmaxHours: 0,
    },
    nasal: {
      bioavailabilityPercent: 75,
      tmaxHours: 0.5,
    },
  },
};

describe('pharmacokinetics - resolveRoute', () => {
  it('returns direct route parameters without food', () => {
    const result = resolveRoute(mockSubstance, 'nasal', false);
    expect(result).toEqual({
      params: { bioavailabilityPercent: 75, tmaxHours: 0.5 },
      usedRoute: 'nasal',
      substituted: false,
    });
  });

  it('applies food effect to routes with absorption (tmax > 0)', () => {
    const result = resolveRoute(mockSubstance, 'oral', true);
    // 50 * 0.8 = 40, 2 * 1.5 = 3
    expect(result).toEqual({
      params: { bioavailabilityPercent: 40, tmaxHours: 3 },
      usedRoute: 'oral',
      substituted: false,
    });
  });

  it('does not apply food effect to routes without absorption (tmax = 0)', () => {
    const result = resolveRoute(mockSubstance, 'intravenous', true);
    expect(result).toEqual({
      params: { bioavailabilityPercent: 100, tmaxHours: 0 },
      usedRoute: 'intravenous',
      substituted: false,
    });
  });

  it('falls back to oral route if direct route is missing', () => {
    const result = resolveRoute(mockSubstance, 'sublingual', false);
    expect(result).toEqual({
      params: { bioavailabilityPercent: 50, tmaxHours: 2 },
      usedRoute: 'oral',
      substituted: true,
    });
  });

  it('falls back to oral route and applies food effect if route is missing and taken with food', () => {
    const result = resolveRoute(mockSubstance, 'sublingual', true);
    expect(result).toEqual({
      params: { bioavailabilityPercent: 40, tmaxHours: 3 },
      usedRoute: 'oral',
      substituted: true,
    });
  });

  it('falls back to intravenous if route is missing and oral is also missing', () => {
    const mockSubstanceNoOral: SubstancePk = {
      ...mockSubstance,
      routes: {
        nasal: { bioavailabilityPercent: 75, tmaxHours: 0.5 }
      }
    };

    const result = resolveRoute(mockSubstanceNoOral, 'sublingual', false);
    expect(result).toEqual({
      params: { bioavailabilityPercent: 100, tmaxHours: 0 },
      usedRoute: 'intravenous',
      substituted: true,
    });
  });
});

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
