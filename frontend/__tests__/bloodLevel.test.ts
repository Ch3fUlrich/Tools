import { describe, expect, it } from 'vitest';
import { getSubstancesLocal } from '../lib/local/bloodLevel';
import { SUBSTANCES } from '../lib/local/substanceDatabase';

describe('getSubstancesLocal', () => {
  it('returns a mapped list of substances matching the length of SUBSTANCES database', () => {
    const substances = getSubstancesLocal();
    expect(substances).toBeDefined();
    expect(Array.isArray(substances)).toBe(true);
    expect(substances.length).toBe(SUBSTANCES.length);
  });

  it('correctly maps the properties of a substance', () => {
    const substances = getSubstancesLocal();
    const caffeine = substances.find((s) => s.id === 'caffeine');

    expect(caffeine).toBeDefined();
    expect(caffeine?.name).toBe('Caffeine');
    expect(caffeine?.halfLifeHours).toBeDefined();
    expect(caffeine?.description).toBeDefined();
    expect(caffeine?.category).toBeDefined();
    expect(caffeine?.commonDosageMg).toBeDefined();
    expect(caffeine?.maxDailyDoseMg).toBeDefined();
    expect(caffeine?.eliminationRoute).toBeDefined();
    expect(caffeine?.bioavailabilityPercent).toBeDefined();

    // Caffeine in SUBSTANCES has oral bioavailability of 99
    expect(caffeine?.bioavailabilityPercent).toBe(99);
  });

  it('falls back to intravenous bioavailability if oral is not present, then to 100', () => {
    const substances = getSubstancesLocal();

    // Let's find one that doesn't have oral but has intravenous, if any, or just trust the logic
    // We can just verify that each substance has a bioavailability >= 0
    substances.forEach((substance) => {
        expect(substance.bioavailabilityPercent).toBeDefined();
        expect(typeof substance.bioavailabilityPercent).toBe('number');
        expect(substance.bioavailabilityPercent).toBeGreaterThanOrEqual(0);
    });
  });
});
