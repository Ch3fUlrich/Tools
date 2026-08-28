import { calculateFatLossLocal } from '../lib/local/fatLoss';
import { rollDiceLocal, saveDiceRollLocal, getDiceHistoryLocal } from '../lib/local/dice';
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

  it('saves dice roll to local history and retrieves it', () => {
    const payload = { die: { type: 'd6' }, count: 2 };
    saveDiceRollLocal(payload);
    const history = getDiceHistoryLocal();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].payload).toEqual(payload);
  });

  it('ignores storage errors gracefully when saving', () => {
    // Mock localStorage to throw an error
    const setItemSpy = vi.spyOn(globalThis.Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      saveDiceRollLocal({ die: { type: 'd6' }, count: 1 });
    }).not.toThrow();

    consoleErrorSpy.mockRestore();
    setItemSpy.mockRestore();
  });
});

describe('local blood level calculation', () => {
  it('exposes the same catalogue as the backend, in the same order', () => {
    // Mirrors get_substances() in backend/src/tools/bloodlevel.rs. If the two drift, the
    // offline fallback silently answers differently from the API — so pin the list.
    expect(getSubstancesLocal().map((s) => s.id)).toEqual([
      'caffeine',
      'nicotine',
      'alcohol',
      'ibuprofen',
      'paracetamol',
      'theobromine',
      'naproxen',
      'aspirin',
      'diphenhydramine',
      'cetirizine',
      'loratadine',
      'melatonin',
      'pseudoephedrine',
      'amoxicillin',
      'metformin',
      'omeprazole',
      'sertraline',
    ]);
  });

  it('gives every substance a usable half-life and bioavailability', () => {
    for (const s of getSubstancesLocal()) {
      // Ethanol is the exception: saturating elimination has no half-life at all.
      if (s.id !== 'alcohol') {
        expect(s.halfLifeHours).toBeGreaterThan(0);
        expect(s.halfLifeHours).toBeLessThan(100);
      }
      expect(s.bioavailabilityPercent).toBeGreaterThan(0);
      expect(s.bioavailabilityPercent).toBeLessThanOrEqual(100);
      expect(s.commonDosageMg).toBeGreaterThan(0);
      expect(s.maxDailyDoseMg).toBeGreaterThanOrEqual(s.commonDosageMg as number);
    }
  });

  it('carries the two substances the tool seeds its worked example with', () => {
    const byId = new Map(getSubstancesLocal().map((s) => [s.id, s]));
    expect(byId.get('caffeine')?.halfLifeHours).toBe(5.7);
    expect(byId.get('ibuprofen')?.halfLifeHours).toBe(2);
    // The contrast between the two is the point of the example.
    expect(byId.get('caffeine')!.halfLifeHours).toBeGreaterThan(byId.get('ibuprofen')!.halfLifeHours);
  });

  it('models an absorption phase rather than an instant peak', () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    const atTmax = '2026-01-01T00:45:00.000Z'; // caffeine oral Tmax = 45 min
    const later = '2026-01-01T06:00:00.000Z';
    const res = calculateToleranceLocal({
      intakes: [{ substance: 'caffeine', time: t0, dosage_mg: 100 }],
      time_points: [t0, atTmax, later],
    });

    expect(res.blood_levels).toHaveLength(3);
    // Nothing is in the blood the instant a swallowed dose is taken.
    expect(res.blood_levels[0].amount_mg).toBeCloseTo(0, 6);
    // It peaks around the published Tmax, then declines.
    expect(res.blood_levels[1].amount_mg).toBeGreaterThan(res.blood_levels[0].amount_mg);
    expect(res.blood_levels[1].amount_mg).toBeGreaterThan(res.blood_levels[2].amount_mg);
    // The peak can never exceed the bioavailable dose.
    expect(res.blood_levels[1].amount_mg).toBeLessThan(99);
  });

  it('puts an intravenous dose straight into the blood', () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    const oneHalfLifeLater = '2026-01-01T05:42:00.000Z'; // caffeine t1/2 = 5.7 h
    const res = calculateToleranceLocal({
      intakes: [{ substance: 'caffeine', time: t0, dosage_mg: 100, route: 'intravenous' }],
      time_points: [t0, oneHalfLifeLater],
    });

    // No absorption phase and F = 100 %, so this is the old pure-decay behaviour.
    expect(res.blood_levels[0].amount_mg).toBeCloseTo(100, 6);
    expect(res.blood_levels[1].amount_mg).toBeCloseTo(50, 4);
  });

  it('lets food delay absorption without destroying the dose', () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    const atOneHour = '2026-01-01T01:00:00.000Z';
    const atSixHours = '2026-01-01T06:00:00.000Z';
    const base = { substance: 'ibuprofen', time: t0, dosage_mg: 400 };

    const fasted = calculateToleranceLocal({ intakes: [base], time_points: [atOneHour, atSixHours] });
    const fed = calculateToleranceLocal({
      intakes: [{ ...base, with_food: true }],
      time_points: [atOneHour, atSixHours],
    });

    // Food flattens the early curve, and the dose is still there afterwards.
    expect(fed.blood_levels[0].amount_mg).toBeLessThan(fasted.blood_levels[0].amount_mg);
    expect(fed.blood_levels[1].amount_mg).toBeGreaterThan(0);
  });

  it('routes a substance without that route back to oral', () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    const atTmax = '2026-01-01T01:00:00.000Z';
    // Ibuprofen has no nasal route in the database.
    const nasal = calculateToleranceLocal({
      intakes: [{ substance: 'ibuprofen', time: t0, dosage_mg: 400, route: 'nasal' }],
      time_points: [atTmax],
    });
    const oral = calculateToleranceLocal({
      intakes: [{ substance: 'ibuprofen', time: t0, dosage_mg: 400, route: 'oral' }],
      time_points: [atTmax],
    });
    expect(nasal.blood_levels[0].amount_mg).toBeCloseTo(oral.blood_levels[0].amount_mg, 6);
  });

  it('uses a faster route where the substance has one', () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    const soonAfter = '2026-01-01T00:10:00.000Z';
    // Nicotine is absorbed far faster inhaled than swallowed, and survives first pass.
    const inhaled = calculateToleranceLocal({
      intakes: [{ substance: 'nicotine', time: t0, dosage_mg: 1, route: 'inhaled' }],
      time_points: [soonAfter],
    });
    const oral = calculateToleranceLocal({
      intakes: [{ substance: 'nicotine', time: t0, dosage_mg: 1, route: 'oral' }],
      time_points: [soonAfter],
    });
    expect(inhaled.blood_levels[0].amount_mg).toBeGreaterThan(oral.blood_levels[0].amount_mg * 3);
  });

  it('eliminates ethanol at a near-constant rate, not by a half-life', () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    // Four standard drinks, sampled once absorption is over and while the amount is still
    // well above Km — that is the region where the rate is genuinely near-constant. Two
    // drinks would be all but cleared by hour three and the rate would tail off.
    const res = calculateToleranceLocal({
      intakes: [{ substance: 'alcohol', time: t0, dosage_mg: 56_000 }],
      time_points: [
        '2026-01-01T02:00:00.000Z',
        '2026-01-01T03:00:00.000Z',
        '2026-01-01T04:00:00.000Z',
      ],
    });

    const firstDrop = res.blood_levels[0].amount_mg - res.blood_levels[1].amount_mg;
    const secondDrop = res.blood_levels[1].amount_mg - res.blood_levels[2].amount_mg;

    expect(firstDrop).toBeGreaterThan(0);
    // Equal time, near-equal loss. First-order decay would roughly halve the second drop.
    expect(secondDrop / firstDrop).toBeGreaterThan(0.85);
    expect(secondDrop / firstDrop).toBeLessThan(1.15);
    // Approaching the textbook Vmax of 8.5 g/h for a 70 kg adult.
    expect(firstDrop).toBeGreaterThan(6_500);
    expect(firstDrop).toBeLessThan(8_500);
  });

  it('never lets ethanol go negative once it has cleared', () => {
    const res = calculateToleranceLocal({
      intakes: [{ substance: 'alcohol', time: '2026-01-01T00:00:00.000Z', dosage_mg: 8_000 }],
      time_points: ['2026-01-02T00:00:00.000Z'],
    });
    expect(res.blood_levels[0].amount_mg).toBeGreaterThanOrEqual(0);
    expect(res.blood_levels[0].amount_mg).toBeLessThan(1);
  });

  it('accepts substance ids and display names, skips future intakes', () => {
    const t0 = '2026-01-01T12:00:00.000Z';
    const res = calculateToleranceLocal({
      intakes: [
        { substance: 'Alcohol (Ethanol)', time: t0, dosage_mg: 100 },
        { substance: 'Alcohol (Ethanol)', time: '2026-01-02T00:00:00.000Z', dosage_mg: 100 },
      ],
      time_points: [t0],
    });
    // At t0 the dose has not been absorbed yet, and the future intake contributes nothing.
    const atT0 = res.blood_levels[0].amount_mg;
    expect(atT0).toBeGreaterThanOrEqual(0);
    expect(atT0).toBeLessThan(1);

    const byId = calculateToleranceLocal({
      intakes: [{ substance: 'alcohol', time: t0, dosage_mg: 100 }],
      time_points: [t0],
    });
    expect(byId.blood_levels[0].amount_mg).toBeCloseTo(atT0, 6);
  });

  it('throws for unknown substances like the backend', () => {
    expect(() =>
      calculateToleranceLocal({
        intakes: [{ substance: 'unobtainium', time: '2026-01-01T00:00:00Z', dosage_mg: 1 }],
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
      data: {
        cash26Data: [{ amount: 'oops' }, null, 5],
        cardTransactions: [{ end_amount: 'oops' }, null, 5, { end_amount: 10, transaction_date: '2024-01-04' }, { transaction_date: '2024-01-05', merchant_name: 'Shop' }],
      },
    });
    expect(res.transactions).toHaveLength(0);
    expect(res.overall_total).toBe(0);

    expect(() => analyzeN26DataLocal({} as Record<string, unknown>)).toThrow(/Invalid N26 data/);
    expect(() => analyzeN26DataLocal({ data: null })).toThrow(/Invalid N26 data/);
    expect(() => analyzeN26DataLocal({ data: "not an object" })).toThrow(/Invalid N26 data/);
  });

  it('handles cardTransactions fallback to end_amount when original_amount is missing', () => {
    const res = analyzeN26DataLocal({
      data: {
        cardTransactions: [
          { end_amount: 25, transaction_date: '2024-01-04', merchant_name: 'Fallback Shop' },
        ],
      },
    });
    expect(res.transactions).toHaveLength(1);
    expect(res.category_totals.cardTransactions).toBeCloseTo(-25);
    expect(res.overall_total).toBeCloseTo(-25);
    expect(res.transactions[0].comment).toBe('Fallback Shop: 25');
  });
});
