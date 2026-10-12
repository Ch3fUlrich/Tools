import { describe, it, expect } from 'vitest';
import { amountFirstOrder, simulateSaturating } from '@/lib/local/pharmacokinetics';

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

describe('pharmacokinetics - simulateSaturating', () => {
  it('returns zeroes when there are no doses', () => {
    const result = simulateSaturating([], 2.0, 1.0, [0, 1, 2, 3]);
    expect(result).toEqual([0, 0, 0, 0]);
  });

  it('handles unsorted sampleHours correctly', () => {
    const doses = [{ hoursFromStart: 1, bioavailableDose: 10, ka: 2.0 }];
    const result = simulateSaturating(doses, 2.0, 1.0, [3, 0, 1, 2]);
    // Values derived from running the simulation
    expect(result[1]).toBe(0); // at t=0
    expect(result[2]).toBe(0); // at t=1
    expect(result[3]).toBeGreaterThan(0); // at t=2
    expect(result[0]).toBeGreaterThan(0); // at t=3
    expect(result[0]).toBeLessThan(result[3]); // less amount at t=3 than t=2
  });

  it('simulates instantaneous intravenous doses (ka is infinite)', () => {
    const doses = [{ hoursFromStart: 0, bioavailableDose: 10, ka: Number.POSITIVE_INFINITY }];
    const result = simulateSaturating(doses, 2.0, 1.0, [0, 0.005, 1, 2]);

    // At exactly t=0, the gut receives dose, but emitUpTo(0) happens before the loop starts, so body is 0.
    // Wait, the emitUpTo(0) emits 0. Then step 0 (t=0 to 0.01) runs.
    expect(result[0]).toBe(0);

    // At t=0.005, which is inside step 0, it should be high but we only emit at ends of steps?
    // Actually emitUpTo(t+stepHours) is called, so t=0.005 is emitted at end of step 0 (t=0.01).
    // The value should be close to 10
    expect(result[1]).toBeCloseTo(9.98, 1);

    // Gradual decrease
    expect(result[2]).toBeCloseTo(8.20, 1);
    expect(result[3]).toBeCloseTo(6.44, 1);
  });

  it('simulates normal absorption doses correctly', () => {
    const doses = [{ hoursFromStart: 0, bioavailableDose: 10, ka: 2.0 }];
    const result = simulateSaturating(doses, 2.0, 1.0, [0, 1, 2, 10]);

    expect(result[0]).toBe(0); // t=0
    expect(result[1]).toBeGreaterThan(0); // t=1

    // It should have some amount at t=10, but close to 0
    expect(result[3]).toBeLessThan(0.2);
  });

  it('handles multiple overlapping doses correctly', () => {
    const singleDose = simulateSaturating(
      [{ hoursFromStart: 0, bioavailableDose: 10, ka: 2.0 }],
      2.0, 1.0, [2]
    );

    const overlappingDoses = simulateSaturating(
      [
        { hoursFromStart: 0, bioavailableDose: 10, ka: 2.0 },
        { hoursFromStart: 2, bioavailableDose: 5, ka: 1.0 }
      ],
      2.0, 1.0, [2]
    );

    // At t=2, the second dose is just being taken, so the amounts should be very close
    expect(overlappingDoses[0]).toBeCloseTo(singleDose[0], 2);

    const overlappingDosesLater = simulateSaturating(
      [
        { hoursFromStart: 0, bioavailableDose: 10, ka: 2.0 },
        { hoursFromStart: 2, bioavailableDose: 5, ka: 1.0 }
      ],
      2.0, 1.0, [4]
    );

    const singleDoseLater = simulateSaturating(
      [{ hoursFromStart: 0, bioavailableDose: 10, ka: 2.0 }],
      2.0, 1.0, [4]
    );

    // At t=4, the overlapping doses should result in more amount than the single dose
    expect(overlappingDosesLater[0]).toBeGreaterThan(singleDoseLater[0]);
  });
});
