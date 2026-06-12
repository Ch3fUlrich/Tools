import { calculateFatLossLocal } from '../lib/local/fatLoss';
import { rollDiceLocal } from '../lib/local/dice';
import { getSubstancesLocal, calculateToleranceLocal } from '../lib/local/bloodLevel';
import { analyzeN26DataLocal } from '../lib/local/n26';

describe('local fat loss calculation', () => {
  it('matches backend formula: 7000 kcal for 1 kg is 100% fat', () => {
    const res = calculateFatLossLocal({ kcal_deficit: 7000, weight_loss_kg: 1 });
    expect(res.is_valid).toBe(true);
    expect(res.fat_loss_percentage).toBeCloseTo(100, 6);
    expect(res.muscle_loss_percentage).toBeCloseTo(0, 6);
  });

  it('returns 0% fat when deficit equals muscle energy', () => {
    const res = calculateFatLossLocal({ kcal_deficit: 2400, weight_loss_kg: 2 });
    expect(res.is_valid).toBe(true);
    expect(res.fat_loss_percentage).toBeCloseTo(0, 6);
    expect(res.muscle_loss_percentage).toBeCloseTo(100, 6);
  });

  it('rejects non-positive inputs and out-of-range results', () => {
    expect(calculateFatLossLocal({ kcal_deficit: 0, weight_loss_kg: 1 }).is_valid).toBe(false);
    expect(calculateFatLossLocal({ kcal_deficit: 3500, weight_loss_kg: -1 }).is_valid).toBe(false);
    expect(calculateFatLossLocal({ kcal_deficit: 1_000_000, weight_loss_kg: 1 }).is_valid).toBe(false);
    expect(calculateFatLossLocal({ kcal_deficit: 100, weight_loss_kg: 1 }).is_valid).toBe(false);
  });
});

describe('local dice rolling', () => {
  it('rolls the requested number of dice within range', () => {
    const res = rollDiceLocal({ die: { type: 'd6' }, count: 10, rolls: 3 });
    expect(res.rolls).toHaveLength(3);
    for (const roll of res.rolls) {
      expect(roll.used).toHaveLength(10);
      for (const v of roll.used) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(6);
      }
      expect(roll.sum).toBe(roll.used.reduce((a, b) => a + b, 0));
    }
    expect(res.summary.totalRollsRequested).toBe(3);
  });

  it('supports custom sides and computes stats', () => {
    const res = rollDiceLocal({ die: { type: 'custom', sides: 3 }, count: 5 });
    const roll = res.rolls[0];
    expect(roll.average).toBeCloseTo(roll.sum / 5);
    const sorted = [...roll.used].sort((a, b) => a - b);
    expect(roll.spread).toBe(sorted[4] - sorted[0]);
    expect(roll.median).toBe(sorted[2]);
  });

  it('honours rerolls below a threshold', () => {
    const res = rollDiceLocal({
      die: { type: 'd6' },
      count: 20,
      reroll: { mode: 'lt', threshold: 2, maxRerolls: 100 },
      maxRerollsPerDie: 100,
    });
    // With 100 allowed rerolls, ending on <=2 is (2/6)^101 — practically impossible.
    for (const v of res.rolls[0].used) {
      expect(v).toBeGreaterThan(2);
    }
    expect(res.rolls[0].perDie.every((d) => d.original.length >= 1)).toBe(true);
  });

  it('advantage per-die picks the higher of two attempts', () => {
    const res = rollDiceLocal({ die: { type: 'd20' }, count: 5, advantage: 'adv' });
    for (const die of res.rolls[0].perDie) {
      expect(die.original.length).toBe(2);
      expect(die.final).toBe(Math.max(...die.original));
    }
  });

  it('per-set disadvantage picks the lower total', () => {
    const res = rollDiceLocal({
      die: { type: 'd6' },
      count: 4,
      advantage: 'dis',
      advantageMode: 'per-set',
    });
    expect(res.rolls[0].used).toHaveLength(4);
  });

  it('enforces backend validation limits with the same messages', () => {
    expect(() => rollDiceLocal({ die: { type: 'd6' }, count: 0 })).toThrow('count must be > 0');
    expect(() => rollDiceLocal({ die: { type: 'd6' }, count: 1000 })).toThrow('count exceeds max allowed');
    expect(() => rollDiceLocal({ die: { type: 'd99' as never }, count: 1 })).toThrow('unknown die type');
    expect(() => rollDiceLocal({ die: { type: 'custom', sides: 20000 }, count: 1 })).toThrow('sides exceeds max allowed');
    expect(() => rollDiceLocal({ die: { type: 'd6' }, count: 1, rolls: 101 })).toThrow('too many independent rolls requested');
  });
});

describe('local blood level calculation', () => {
  it('exposes the same five substances as the backend', () => {
    const subs = getSubstancesLocal();
    expect(subs.map((s) => s.id)).toEqual(['caffeine', 'nicotine', 'alcohol', 'ibuprofen', 'paracetamol']);
  });

  it('applies bioavailability and half-life decay', () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    const oneHalfLifeLater = '2026-01-01T05:42:00.000Z'; // caffeine t1/2 = 5.7 h
    const res = calculateToleranceLocal({
      intakes: [{ substance: 'caffeine', time: t0, intake_type: 'oral', time_after_meal: null, dosage_mg: 100 }],
      time_points: [t0, oneHalfLifeLater],
    });
    expect(res.blood_levels).toHaveLength(2);
    // At t0: 100 mg * 99% bioavailability.
    expect(res.blood_levels[0].amount_mg).toBeCloseTo(99, 6);
    // One half-life later: half remains.
    expect(res.blood_levels[1].amount_mg).toBeCloseTo(49.5, 6);
  });

  it('accepts substance ids and display names, skips future intakes', () => {
    const t0 = '2026-01-01T12:00:00.000Z';
    const res = calculateToleranceLocal({
      intakes: [
        { substance: 'Alcohol (Ethanol)', time: t0, intake_type: 'oral', time_after_meal: null, dosage_mg: 100 },
        { substance: 'Alcohol (Ethanol)', time: '2026-01-02T00:00:00.000Z', intake_type: 'oral', time_after_meal: null, dosage_mg: 100 },
      ],
      time_points: [t0],
    });
    expect(res.blood_levels[0].amount_mg).toBeCloseTo(100, 6); // only the past intake counts

    const byId = calculateToleranceLocal({
      intakes: [{ substance: 'alcohol', time: t0, intake_type: 'oral', time_after_meal: null, dosage_mg: 100 }],
      time_points: [t0],
    });
    expect(byId.blood_levels[0].amount_mg).toBeCloseTo(100, 6);
  });

  it('throws for unknown substances like the backend', () => {
    expect(() =>
      calculateToleranceLocal({
        intakes: [{ substance: 'unobtainium', time: '2026-01-01T00:00:00Z', intake_type: 'oral', time_after_meal: null, dosage_mg: 1 }],
        time_points: ['2026-01-01T00:00:00Z'],
      }),
    ).toThrow(/not found in database/);
  });
});

describe('local N26 analysis', () => {
  it('processes all three sections like the backend', () => {
    const res = analyzeN26DataLocal({
      id: '1',
      created: '2024-01-01',
      data: {
        cash26Data: [{ amount: 10.5, transaction_date: '2024-01-01', transaction_type: 'cash' }],
        bankTransfers: [{ amount: 100, ts: '2024-01-02', reference_text: 'salary' }],
        cardTransactions: [
          { end_amount: 20, transaction_date: '2024-01-03', merchant_name: 'Shop', original_amount: 19.5 },
        ],
      },
    });
    expect(res.transactions).toHaveLength(3);
    expect(res.category_totals.cash26Data).toBeCloseTo(10.5);
    expect(res.category_totals.bankTransfers).toBeCloseTo(100);
    expect(res.category_totals.cardTransactions).toBeCloseTo(-20);
    expect(res.overall_total).toBeCloseTo(90.5);
    expect(res.transactions[2].comment).toBe('Shop: 19.5');
  });

  it('skips malformed entries and rejects missing data object', () => {
    const res = analyzeN26DataLocal({
      data: { cash26Data: [{ amount: 'oops' }, null, 5] },
    });
    expect(res.transactions).toHaveLength(0);
    expect(res.overall_total).toBe(0);

    expect(() => analyzeN26DataLocal({} as Record<string, unknown>)).toThrow(/Invalid N26 data/);
  });
});
