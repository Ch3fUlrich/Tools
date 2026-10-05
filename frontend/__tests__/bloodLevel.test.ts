import { describe, it, expect } from 'vitest';
import { calculateToleranceLocal, getSubstancesLocal } from '@/lib/local/bloodLevel';

describe('calculateToleranceLocal', () => {
  it('should return empty blood levels if no intakes are provided', () => {
    const result = calculateToleranceLocal({
      intakes: [],
      time_points: ['2023-01-01T00:00:00Z', '2023-01-01T01:00:00Z'],
    });
    expect(result.blood_levels).toEqual([]);
  });

  it('should throw an error for unknown substances', () => {
    expect(() => {
      calculateToleranceLocal({
        intakes: [{ substance: 'unknown-substance', time: '2023-01-01T00:00:00Z', dosage_mg: 100 }],
        time_points: ['2023-01-01T01:00:00Z'],
      });
    }).toThrow("Substance 'unknown-substance' not found in database");
  });

  it('handles invalid routes by falling back to oral', () => {
    // Both doses should have identical outcomes because 'unknown-route' falls back to 'oral'
    const unknownRoute = calculateToleranceLocal({
      intakes: [
        {
          substance: 'ibuprofen',
          time: '2023-01-01T00:00:00Z',
          dosage_mg: 400,
          route: 'unknown-route',
        },
      ],
      time_points: ['2023-01-01T01:00:00Z'],
    });

    const oralRoute = calculateToleranceLocal({
      intakes: [
        { substance: 'ibuprofen', time: '2023-01-01T00:00:00Z', dosage_mg: 400, route: 'oral' },
      ],
      time_points: ['2023-01-01T01:00:00Z'],
    });

    expect(unknownRoute.blood_levels[0].amount_mg).toBeCloseTo(
      oralRoute.blood_levels[0].amount_mg,
      6,
    );
  });

  it('should calculate tolerance correctly for a first-order elimination substance', () => {
    const result = calculateToleranceLocal({
      intakes: [{ substance: 'caffeine', time: '2023-01-01T00:00:00Z', dosage_mg: 100 }],
      time_points: ['2023-01-01T00:45:00Z', '2023-01-01T06:00:00Z'],
    });

    expect(result.blood_levels.length).toBe(2);
    expect(result.blood_levels[0].substance).toBe('caffeine');
    expect(result.blood_levels[0].time).toBe('2023-01-01T00:45:00Z');
    expect(result.blood_levels[0].amount_mg).toBeGreaterThan(0);

    expect(result.blood_levels[1].substance).toBe('caffeine');
    expect(result.blood_levels[1].time).toBe('2023-01-01T06:00:00Z');
    expect(result.blood_levels[1].amount_mg).toBeGreaterThan(0);
    expect(result.blood_levels[1].amount_mg).toBeLessThan(result.blood_levels[0].amount_mg);
  });

  it('should calculate tolerance correctly for a saturating elimination substance', () => {
    const result = calculateToleranceLocal({
      intakes: [{ substance: 'alcohol', time: '2023-01-01T00:00:00Z', dosage_mg: 20000 }],
      time_points: ['2023-01-01T01:00:00Z', '2023-01-01T02:00:00Z'],
    });

    expect(result.blood_levels.length).toBe(2);
    expect(result.blood_levels[0].substance).toBe('alcohol');
    expect(result.blood_levels[0].amount_mg).toBeGreaterThan(0);
    expect(result.blood_levels[1].substance).toBe('alcohol');
  });

  it('handles negative or invalid elapsed times gracefully by treating amount as 0', () => {
    const result = calculateToleranceLocal({
      intakes: [{ substance: 'caffeine', time: '2023-01-01T12:00:00Z', dosage_mg: 100 }],
      time_points: ['2023-01-01T11:00:00Z'], // Time point before intake
    });
    expect(result.blood_levels.length).toBe(1);
    expect(result.blood_levels[0].amount_mg).toBe(0);
  });

  it('correctly groups intakes by substance', () => {
    const result = calculateToleranceLocal({
      intakes: [
        { substance: 'caffeine', time: '2023-01-01T00:00:00Z', dosage_mg: 100 },
        { substance: 'ibuprofen', time: '2023-01-01T00:00:00Z', dosage_mg: 200 },
        { substance: 'caffeine', time: '2023-01-01T02:00:00Z', dosage_mg: 50 },
      ],
      time_points: ['2023-01-01T03:00:00Z'],
    });

    expect(result.blood_levels.length).toBe(2);

    const caffeineLevel = result.blood_levels.find((b) => b.substance === 'caffeine');
    const ibuprofenLevel = result.blood_levels.find((b) => b.substance === 'ibuprofen');

    expect(caffeineLevel).toBeDefined();
    expect(ibuprofenLevel).toBeDefined();
    expect(caffeineLevel!.amount_mg).toBeGreaterThan(0);
    expect(ibuprofenLevel!.amount_mg).toBeGreaterThan(0);
  });
});

describe('getSubstancesLocal', () => {
  it('returns a populated catalogue of substances', () => {
    const substances = getSubstancesLocal();
    expect(substances.length).toBeGreaterThan(0);

    const caffeine = substances.find((s) => s.id === 'caffeine');
    expect(caffeine).toBeDefined();
    expect(caffeine?.name).toBe('Caffeine');
    expect(caffeine?.halfLifeHours).toBeGreaterThan(0);
    expect(caffeine?.bioavailabilityPercent).toBeGreaterThan(0);
  });
});
