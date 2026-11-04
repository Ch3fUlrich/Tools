import { describe, expect, it } from 'vitest';
import {
  evaluateScenario,
  type ElterngeldProfile,
  type HouseholdProfile,
} from '@/lib/local/elterngeld';

const baseProfile: ElterngeldProfile = {
  baseYear: 2026,
  annualProfit: 13_421.69,
  annualEmploymentGross: 0,
  insurance: { pflichtKV: false, pflichtRV: true, pflichtAV: false, childless: false },
  monthlyNetIncomeDuringLeave: 0,
  siblingBonus: false,
  multipleBirthExtraChildren: 0,
  basisMonths: 12,
  plusMonths: 0,
};

const baseHousehold: HouseholdProfile = {
  filing: 'single',
  profitDeltaKind: 'timing',
  leaveYear: 2026,
  partnerIncomeBaseYear: 0,
  partnerIncomeLeaveYear: 0,
  applicantIncomeLeaveYear: 0,
  deductionsBaseYear: 0,
  deductionsLeaveYear: 0,
  taxPrepaidBaseYear: 0,
  taxPrepaidLeaveYear: 0,
  children: 1,
  futureReliefRate: 0,
  maternity: { enabled: false, weeksBefore: 0, weeksAfter: 0, extraContributionTotal: 0 },
};

describe('evaluateScenario', () => {
  it('correctly returns a baseline ScenarioResult', () => {
    const result = evaluateScenario('test-scenario', baseProfile, baseHousehold, 10_000);
    expect(result.label).toBe('test-scenario');
    expect(result.annualProfit).toBe(13_421.69);

    // Check some of the calculated fields
    expect(result.baseYearZvE).toBeGreaterThan(0);
    expect(result.netPosition).toBeDefined();
    expect(result.amount.total).toBeGreaterThan(0);
    expect(result.maternity).toBeNull();
  });

  it('handles scenarios where income exceeds the Elterngeld income limit', () => {
    // 2024+ income limit is 200,000 ZvE
    const highIncomeHousehold = { ...baseHousehold, partnerIncomeBaseYear: 250_000 };
    const result = evaluateScenario('high-income', baseProfile, highIncomeHousehold, 10_000);

    expect(result.exceedsIncomeLimit).toBe(true);
    expect(result.amount.basisMonthly).toBe(0);
    expect(result.amount.total).toBe(0);
  });

  it('calculates postponed deductions value correctly based on profitDeltaKind', () => {
    // Under 'timing', differences from referenceProfit are deferred deductions.
    const timingResult = evaluateScenario('timing', baseProfile, { ...baseHousehold, futureReliefRate: 0.42 }, 10_000);
    const cashResult = evaluateScenario('cash', baseProfile, { ...baseHousehold, profitDeltaKind: 'cash', futureReliefRate: 0.42 }, 10_000);

    // 13,421.69 - 10,000 = 3,421.69 deferred deduction. Value = 3,421.69 * 0.42 = 1,437.11
    expect(timingResult.deferredDeductionValue).toBeCloseTo((13421.69 - 10000) * 0.42, 2);
    // Cash election means money is permanently earned, not deferred.
    expect(cashResult.deferredDeductionValue).toBe(0);
  });

  it('computes progression cost in the leave year correctly', () => {
    const earningHousehold = { ...baseHousehold, applicantIncomeLeaveYear: 30_000, partnerIncomeLeaveYear: 40_000 };
    const result = evaluateScenario('with-progression', baseProfile, earningHousehold, 10_000);

    // Since benefitsTotal > 0 (Elterngeld is received), it should trigger Progressionsvorbehalt
    expect(result.benefitsTotal).toBeGreaterThan(0);
    expect(result.leaveYearTax.total).toBeGreaterThan(result.leaveYearTaxWithoutProgression.total);
    expect(result.progressionCost).toBeCloseTo(result.leaveYearTax.total - result.leaveYearTaxWithoutProgression.total, 5);
  });

  it('includes maternity correctly when income is not exceeded', () => {
    const maternityHousehold = {
      ...baseHousehold,
      maternity: { enabled: true, weeksBefore: 6, weeksAfter: 8, extraContributionTotal: 500 }
    };
    const result = evaluateScenario('with-maternity', baseProfile, maternityHousehold, 10_000);

    expect(result.maternity).not.toBeNull();
    expect(result.maternity!.total).toBeGreaterThan(0);
    expect(result.maternity!.daysBefore).toBe(42);
    expect(result.maternity!.daysAfter).toBe(56);
  });
});
