import { describe, expect, it } from 'vitest';
import {
  TARIFF_2025,
  TARIFF_2026,
  calculateTax,
  grundtarifTax,
  incomeTax,
  marginalTaxRate,
  solidaritySurcharge,
} from '@/lib/local/germanTax';
import {
  BASIS_MAX,
  BASIS_MIN,
  BEMESSUNG_CAP,
  compareScenarios,
  elterngeldAmount,
  elterngeldNetto,
  findOptimum,
  replacementRate,
  socialContributionRate,
  sweepProfit,
  vorsorgepauschale,
  type ElterngeldProfile,
  type HouseholdProfile,
} from '@/lib/local/elterngeld';

// A self-employed Kindertagespflegeperson: compulsory pension insurance
// (§ 2 Satz 1 Nr. 3 SGB VI), voluntarily rather than compulsorily in the GKV.
const baseProfile: ElterngeldProfile = {
  baseYear: 2026,
  annualProfit: 13_421.69,
  annualEmploymentGross: 0,
  insurance: { pflichtKV: false, pflichtRV: true, pflichtAV: false, childless: false },
  churchTaxPercent: 0,
  monthlyNetIncomeDuringLeave: 0,
  siblingBonus: false,
  multipleBirthExtraChildren: 0,
  basisMonths: 12,
  plusMonths: 0,
};

const baseHousehold: HouseholdProfile = {
  filing: 'single',
  profitDeltaKind: 'timing',
  churchTaxPercent: 0,
  leaveYear: 2026,
  partnerIncomeBaseYear: 0,
  partnerIncomeLeaveYear: 0,
  applicantIncomeLeaveYear: 0,
  deductionsBaseYear: 0,
  deductionsLeaveYear: 0,
  futureReliefRate: 0,
};

describe('§ 32a EStG income tax tariff', () => {
  it('is zero up to and including the Grundfreibetrag', () => {
    expect(grundtarifTax(12_096, TARIFF_2025)).toBe(0);
    expect(grundtarifTax(12_348, TARIFF_2026)).toBe(0);
    expect(grundtarifTax(0, TARIFF_2026)).toBe(0);
    expect(grundtarifTax(-5_000, TARIFF_2026)).toBe(0);
  });

  it('matches the published Grundtabelle at 30,000 EUR', () => {
    // Zone 3 for both years.
    expect(grundtarifTax(30_000, TARIFF_2025)).toBe(4_303);
    expect(grundtarifTax(30_000, TARIFF_2026)).toBe(4_217);
  });

  it('lowers the 2026 burden relative to 2025 at the same income', () => {
    for (const zvE of [15_000, 25_000, 45_000, 80_000]) {
      expect(grundtarifTax(zvE, TARIFF_2026)).toBeLessThan(grundtarifTax(zvE, TARIFF_2025));
    }
  });

  it('applies the 42 % and 45 % linear zones', () => {
    expect(grundtarifTax(100_000, TARIFF_2026)).toBe(Math.floor(0.42 * 100_000 - 11_135.63));
    expect(grundtarifTax(300_000, TARIFF_2026)).toBe(Math.floor(0.45 * 300_000 - 19_470.38));
  });

  it('is monotonically increasing', () => {
    let previous = 0;
    for (let zvE = 0; zvE <= 300_000; zvE += 2_500) {
      const tax = grundtarifTax(zvE, TARIFF_2026);
      expect(tax).toBeGreaterThanOrEqual(previous);
      previous = tax;
    }
  });

  it('applies Ehegattensplitting as twice the tax on half the income', () => {
    expect(incomeTax(60_000, TARIFF_2026, 'married')).toBe(2 * grundtarifTax(30_000, TARIFF_2026));
    // Splitting never costs more than individual assessment of the same total.
    expect(incomeTax(60_000, TARIFF_2026, 'married')).toBeLessThan(
      incomeTax(60_000, TARIFF_2026, 'single'),
    );
  });
});

describe('Solidaritätszuschlag', () => {
  it('is zero at or below the Freigrenze', () => {
    expect(solidaritySurcharge(20_350, TARIFF_2026, 'single')).toBe(0);
    expect(solidaritySurcharge(40_700, TARIFF_2026, 'married')).toBe(0);
  });

  it('is limited to 11.9 % of the excess inside the Milderungszone', () => {
    const soli = solidaritySurcharge(21_000, TARIFF_2026, 'single');
    expect(soli).toBeCloseTo(0.119 * (21_000 - 20_350), 6);
    expect(soli).toBeLessThan(0.055 * 21_000);
  });

  it('reaches the full 5.5 % well above the Milderungszone', () => {
    expect(solidaritySurcharge(200_000, TARIFF_2026, 'single')).toBeCloseTo(0.055 * 200_000, 6);
  });
});

describe('Progressionsvorbehalt (§ 32b EStG)', () => {
  const options = { tariff: TARIFF_2026, filing: 'single' as const, churchTaxPercent: 0 as const };

  it('raises the tax on the remaining income without taxing the benefit', () => {
    const without = calculateTax(20_000, options);
    const with_ = calculateTax(20_000, { ...options, progressionIncome: 10_000 });

    expect(with_.total).toBeGreaterThan(without.total);
    // Never as much as taxing the benefit outright.
    expect(with_.total).toBeLessThan(calculateTax(30_000, options).total);
  });

  it('costs nothing when there is no other taxable income', () => {
    const result = calculateTax(0, { ...options, progressionIncome: 12_000 });
    expect(result.total).toBe(0);
  });

  it('reports a marginal rate that rises with income', () => {
    expect(marginalTaxRate(60_000, options)).toBeGreaterThan(marginalTaxRate(20_000, options));
  });
});

describe('§ 2f BEEG flat social contributions', () => {
  it('sums only the branches the person is compulsorily insured in', () => {
    expect(socialContributionRate({ pflichtKV: true, pflichtRV: true, pflichtAV: true, childless: false }))
      .toBeCloseTo(0.21, 10);
    expect(socialContributionRate({ pflichtKV: false, pflichtRV: true, pflichtAV: false, childless: false }))
      .toBeCloseTo(0.1, 10);
    expect(socialContributionRate({ pflichtKV: false, pflichtRV: false, pflichtAV: false, childless: false }))
      .toBe(0);
  });
});

describe('Vorsorgepauschale', () => {
  it('adds the pension component only for the compulsorily insured', () => {
    const withRv = vorsorgepauschale(30_000, { pflichtKV: false, pflichtRV: true, pflichtAV: false, childless: false }, 2026);
    const withoutRv = vorsorgepauschale(30_000, { pflichtKV: false, pflichtRV: false, pflichtAV: false, childless: false }, 2026);
    expect(withRv - withoutRv).toBeCloseTo(30_000 * TARIFF_2026.rvEmployeeRate, 6);
  });

  it('never falls below the Mindestvorsorgepauschale', () => {
    const vp = vorsorgepauschale(10_000, { pflichtKV: false, pflichtRV: false, pflichtAV: false, childless: false }, 2026);
    expect(vp).toBeCloseTo(1_200, 6); // 12 % of 10,000, below the 1,900 cap
  });

  it('caps the Mindestvorsorgepauschale at 1,900 EUR', () => {
    const vp = vorsorgepauschale(80_000, { pflichtKV: false, pflichtRV: false, pflichtAV: false, childless: false }, 2026);
    expect(vp).toBeCloseTo(1_900, 6);
  });
});

describe('§ 2 Abs. 2 BEEG replacement rate', () => {
  it('is a flat 67 % in the 1,000–1,200 EUR corridor', () => {
    expect(replacementRate(1_000)).toBeCloseTo(0.67, 10);
    expect(replacementRate(1_100)).toBeCloseTo(0.67, 10);
    expect(replacementRate(1_200)).toBeCloseTo(0.67, 10);
  });

  it('rises below 1,000 EUR by 0.1 pp per full 2 EUR', () => {
    expect(replacementRate(900)).toBeCloseTo(0.72, 10); // 50 steps
    expect(replacementRate(500)).toBeCloseTo(0.92, 10); // 250 steps
  });

  it('never exceeds 100 %', () => {
    expect(replacementRate(100)).toBeCloseTo(1, 10);
    expect(replacementRate(0)).toBeCloseTo(1, 10);
  });

  it('falls above 1,200 EUR and reaches its 65 % floor at 1,240 EUR', () => {
    expect(replacementRate(1_220)).toBeCloseTo(0.66, 10);
    expect(replacementRate(1_240)).toBeCloseTo(0.65, 10);
    expect(replacementRate(5_000)).toBeCloseTo(0.65, 10);
  });
});

describe('Elterngeld amount', () => {
  it('honours the 300 EUR floor and the 1,800 EUR ceiling', () => {
    const tiny = elterngeldAmount({ ...baseProfile, annualProfit: 0 }, 0);
    expect(tiny.basisMonthly).toBe(BASIS_MIN);

    const huge = elterngeldAmount({ ...baseProfile, annualProfit: 500_000 }, 10_000);
    expect(huge.basisMonthly).toBe(BASIS_MAX);
  });

  it('caps the assessment base at 2,770 EUR', () => {
    const atCap = elterngeldAmount(baseProfile, BEMESSUNG_CAP);
    const aboveCap = elterngeldAmount(baseProfile, BEMESSUNG_CAP + 5_000);
    expect(atCap.basisMonthly).toBeCloseTo(aboveCap.basisMonthly, 6);
    expect(aboveCap.cappedNetto).toBe(BEMESSUNG_CAP);
  });

  it('adds the Geschwisterbonus with its 75 EUR minimum', () => {
    const withBonus = elterngeldAmount({ ...baseProfile, siblingBonus: true }, 800);
    const withoutBonus = elterngeldAmount(baseProfile, 800);
    // 10 % of a ~660 EUR base is below 75 EUR, so the floor applies.
    expect(withBonus.siblingBonus).toBe(75);
    expect(withBonus.basisMonthly - withoutBonus.basisMonthly).toBeCloseTo(75, 6);
  });

  it('adds 300 EUR per additional child of a multiple birth', () => {
    const twins = elterngeldAmount({ ...baseProfile, multipleBirthExtraChildren: 1 }, 1_500);
    const single = elterngeldAmount(baseProfile, 1_500);
    expect(twins.basisMonthly - single.basisMonthly).toBeCloseTo(300, 6);
  });

  it('pays ElterngeldPlus at half the rate within its own 150/900 EUR bounds', () => {
    const amount = elterngeldAmount({ ...baseProfile, basisMonths: 0, plusMonths: 24 }, 1_500);
    expect(amount.plusMonthly).toBeCloseTo(amount.basisBeforeBonus / 2, 6);
    expect(amount.plusMonthly).toBeGreaterThanOrEqual(150);
    expect(amount.plusMonthly).toBeLessThanOrEqual(900);
    expect(amount.totalPlus).toBeCloseTo(amount.plusMonthly * 24, 6);
  });

  it('only replaces the difference when income continues during leave', () => {
    const idle = elterngeldAmount(baseProfile, 2_000);
    const working = elterngeldAmount({ ...baseProfile, monthlyNetIncomeDuringLeave: 800 }, 2_000);
    expect(working.basisMonthly).toBeLessThan(idle.basisMonthly);
  });
});

describe('Elterngeld-Netto for a self-employed applicant', () => {
  it('deducts the flat 10 % pension contribution and the simulated tax', () => {
    const netto = elterngeldNetto(baseProfile);

    expect(netto.monthlyGross).toBeCloseTo(13_421.69 / 12, 6);
    expect(netto.monthlySocialContributions).toBeCloseTo(netto.monthlyGross * 0.1, 6);
    // 13,421.69 minus the Vorsorgepauschale lands below the 2026 Grundfreibetrag.
    expect(netto.annualTax).toBe(0);
    expect(netto.monthlyNetto).toBeCloseTo(netto.monthlyGross * 0.9, 6);
  });

  it('produces a higher Elterngeld-Netto for a higher declared profit', () => {
    const low = elterngeldNetto(baseProfile);
    const high = elterngeldNetto({ ...baseProfile, annualProfit: 24_470.36 });
    expect(high.monthlyNetto).toBeGreaterThan(low.monthlyNetto);
    expect(high.annualTax).toBeGreaterThan(0);
  });
});

describe('scenario comparison — the actual decision', () => {
  it('prefers the higher declared profit for a low-income single applicant', () => {
    const comparison = compareScenarios(
      [
        { label: 'Alle Abschreibungen', annualProfit: 13_421.69 },
        { label: 'Pauschale', annualProfit: 24_470.36 },
      ],
      baseProfile,
      baseHousehold,
    );

    expect(comparison.scenarios).toHaveLength(2);
    expect(comparison.bestIndex).toBe(1);
    expect(comparison.referenceIndex).toBe(0);
    expect(comparison.advantage).toBeGreaterThan(0);

    const [low, high] = comparison.scenarios;
    expect(high.amount.total).toBeGreaterThan(low.amount.total);
    expect(high.baseYearTax.total).toBeGreaterThan(low.baseYearTax.total);
    // The Elterngeld gain has to outweigh the extra tax for the recommendation to flip.
    expect(high.amount.total - low.amount.total).toBeGreaterThan(
      high.baseYearTax.total - low.baseYearTax.total,
    );
  });

  it('withdraws the entitlement above the 175,000 EUR limit', () => {
    const result = compareScenarios(
      [{ label: 'Sehr hoch', annualProfit: 200_000 }],
      baseProfile,
      baseHousehold,
    );
    expect(result.scenarios[0].exceedsIncomeLimit).toBe(true);
    expect(result.scenarios[0].amount.total).toBe(0);
  });

  it('charges Progressionsvorbehalt only when there is other income in the leave year', () => {
    const idle = compareScenarios([{ label: 'a', annualProfit: 20_000 }], baseProfile, baseHousehold);
    expect(idle.scenarios[0].progressionCost).toBe(0);

    const earning = compareScenarios([{ label: 'a', annualProfit: 20_000 }], baseProfile, {
      ...baseHousehold,
      filing: 'married',
      partnerIncomeLeaveYear: 55_000,
    });
    expect(earning.scenarios[0].progressionCost).toBeGreaterThan(0);
  });

  it('credits postponed deductions at the chosen future relief rate', () => {
    const withRelief = compareScenarios(
      [
        { label: 'low', annualProfit: 13_421.69 },
        { label: 'high', annualProfit: 24_470.36 },
      ],
      baseProfile,
      { ...baseHousehold, futureReliefRate: 0.3 },
    );
    const [, high] = withRelief.scenarios;
    expect(high.deferredDeductionValue).toBeCloseTo((24_470.36 - 13_421.69) * 0.3, 6);
  });

  it('treats a timing election as non-cash but extra earnings as cash', () => {
    const definitions = [
      { label: 'low', annualProfit: 13_421.69 },
      { label: 'high', annualProfit: 24_470.36 },
    ];
    const timing = compareScenarios(definitions, baseProfile, baseHousehold);
    const cash = compareScenarios(definitions, baseProfile, {
      ...baseHousehold,
      profitDeltaKind: 'cash',
    });

    // Identical tax and Elterngeld — only the cash attribution differs.
    expect(timing.scenarios[1].baseYearTax.total).toBe(cash.scenarios[1].baseYearTax.total);
    expect(timing.scenarios[1].amount.total).toBeCloseTo(cash.scenarios[1].amount.total, 6);

    // Under a timing election the reference scenario's cash applies to both.
    expect(timing.scenarios[1].netPosition).toBeCloseTo(
      cash.scenarios[1].netPosition - (24_470.36 - 13_421.69),
      6,
    );
    // The reference scenario itself is unaffected by the switch.
    expect(timing.scenarios[0].netPosition).toBeCloseTo(cash.scenarios[0].netPosition, 6);
  });

  it('does not credit deferred relief when the extra profit is real earnings', () => {
    const cash = compareScenarios(
      [
        { label: 'low', annualProfit: 13_421.69 },
        { label: 'high', annualProfit: 24_470.36 },
      ],
      baseProfile,
      { ...baseHousehold, profitDeltaKind: 'cash', futureReliefRate: 0.3 },
    );
    expect(cash.scenarios[1].deferredDeductionValue).toBe(0);
  });

  it('returns an empty comparison for an empty definition list', () => {
    const empty = compareScenarios([], baseProfile, baseHousehold);
    expect(empty.scenarios).toEqual([]);
    expect(empty.bestIndex).toBe(-1);
    expect(empty.advantage).toBe(0);
  });
});

describe('profit sweep', () => {
  it('produces the requested number of ordered sample points', () => {
    const points = sweepProfit(baseProfile, baseHousehold, 10_000, 40_000, 25);
    expect(points).toHaveLength(25);
    expect(points[0].annualProfit).toBeCloseTo(10_000, 6);
    expect(points[points.length - 1].annualProfit).toBeCloseTo(40_000, 6);
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i].annualProfit).toBeGreaterThan(points[i - 1].annualProfit);
    }
  });

  it('finds an optimum that is at least as good as every sample', () => {
    const points = sweepProfit(baseProfile, baseHousehold, 5_000, 90_000, 40);
    const best = findOptimum(points);
    expect(best).not.toBeNull();
    for (const p of points) {
      expect(p.netPosition).toBeLessThanOrEqual(best!.netPosition);
    }
  });

  it('returns null for an empty sweep', () => {
    expect(findOptimum([])).toBeNull();
  });
});
