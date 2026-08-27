// Elterngeld decision model (BEEG) — is it worth declaring a *higher* profit in
// the assessment year, paying more income tax, in order to receive more
// Elterngeld during parental leave?
//
// Everything here is a pure function of its inputs. No network, no storage:
// financial data never leaves the browser.
//
// Statutory basis
//   § 1 Abs. 8 BEEG   Einkommensgrenze (175,000 € zvE) — entitlement cut-off
//   § 2  BEEG         Höhe des Elterngeldes: 67 %, sliding rate, 300/1,800 €, 2,770 € cap
//   § 2a BEEG         Geschwisterbonus (+10 %, min. 75 €), Mehrlingszuschlag (300 €)
//   § 2b BEEG         Bemessungszeitraum: last completed tax year for self-employed
//   § 2d BEEG         Gewinn from the Einkommensteuerbescheid
//   § 2e BEEG         Abzüge für Steuern (Lohnsteuer-style, Steuerklasse IV)
//   § 2f BEEG         Abzüge für Sozialabgaben: flat 9 % / 10 % / 2 %
//   § 4  BEEG         12 Basiselterngeld months + 2 Partnermonate
//   § 4a BEEG         ElterngeldPlus: half the amount, twice the duration
//   § 32b EStG        Progressionsvorbehalt — Elterngeld is tax-free but raises the rate

import {
  calculateTax,
  getTariff,
  type ChurchTaxPercent,
  type FilingStatus,
  type TaxBreakdown,
  type TaxYear,
} from './germanTax';

// ─────────────────────────────────────────────────────────────────────────────
// Statutory constants
// ─────────────────────────────────────────────────────────────────────────────

/** § 2f Abs. 1 Nr. 1 BEEG — flat deduction for Kranken-/Pflegeversicherung. */
export const SV_RATE_KV = 0.09;
/** § 2f Abs. 1 Nr. 2 BEEG — flat deduction for Rentenversicherung. */
export const SV_RATE_RV = 0.1;
/** § 2f Abs. 1 Nr. 3 BEEG — flat deduction for Arbeitsförderung. */
export const SV_RATE_AV = 0.02;

/** § 2 Abs. 1 Satz 3 BEEG — the pre-birth Elterngeld-Netto counts at most this much. */
export const BEMESSUNG_CAP = 2_770;
/** § 2 Abs. 4 BEEG. */
export const BASIS_MIN = 300;
/** § 2 Abs. 1 BEEG. */
export const BASIS_MAX = 1_800;
/** § 4a Abs. 2 BEEG. */
export const PLUS_MIN = 150;
/** § 4a Abs. 2 BEEG. */
export const PLUS_MAX = 900;

/** § 2a Abs. 1 BEEG. */
export const SIBLING_BONUS_RATE = 0.1;
/** § 2a Abs. 1 BEEG. */
export const SIBLING_BONUS_MIN = 75;
/** § 2a Abs. 4 BEEG — per additional child of a multiple birth. */
export const MULTIPLE_BIRTH_SUPPLEMENT = 300;

/** § 1 Abs. 8 BEEG — births from 1 April 2025, couples and single parents alike. */
export const INCOME_LIMIT_ZVE = 175_000;

/** § 24i SGB V / § 47 SGB V — Mutterschaftsgeld equals the Krankengeld rate. */
export const MUTTERSCHAFTSGELD_RATE = 0.7;
/** Social-insurance convention: a year counts as 360 days for the Regelentgelt. */
export const SV_DAYS_PER_YEAR = 360;
/** § 3 Abs. 1 MuSchG — protection period before the expected date of birth. */
export const MUTTERSCHUTZ_WEEKS_BEFORE = 6;
/** § 3 Abs. 2 MuSchG — 8 weeks normally, 12 for multiple/premature births. */
export const MUTTERSCHUTZ_WEEKS_AFTER = 8;
/** Average length of a Lebensmonat (365.25 / 12). */
export const DAYS_PER_LEBENSMONAT = 365.25 / 12;

/** § 9a Satz 1 Nr. 1 Buchst. a EStG — only applied when there is employment income. */
export const ARBEITNEHMER_PAUSCHBETRAG = 1_230;
/** § 39b Abs. 2 Satz 5 Nr. 3 Buchst. e EStG — Mindestvorsorgepauschale ceiling. */
export const MINDESTVORSORGE_CAP = 1_900;
/** § 39b Abs. 2 Satz 5 Nr. 3 Buchst. e EStG — 12 % of the assessment base. */
export const MINDESTVORSORGE_RATE = 0.12;
/** Childless surcharge on long-term care insurance (§ 55 Abs. 3 SGB XI). */
export const PV_CHILDLESS_SURCHARGE = 0.006;

// ─────────────────────────────────────────────────────────────────────────────
// Inputs
// ─────────────────────────────────────────────────────────────────────────────

export interface InsuranceStatus {
  /** Versicherungspflichtig in der gesetzlichen Krankenversicherung (not: freiwillig versichert). */
  pflichtKV: boolean;
  /** Versicherungspflichtig in der gesetzlichen Rentenversicherung. Kindertagespflege: yes (§ 2 Satz 1 Nr. 3 SGB VI). */
  pflichtRV: boolean;
  /** Versicherungspflichtig nach SGB III (rare for the self-employed). */
  pflichtAV: boolean;
  /** Childless for long-term care insurance purposes (affects the Vorsorgepauschale only). */
  childless: boolean;
}

export interface ElterngeldProfile {
  /** Bemessungszeitraum — the last completed tax year before the birth (§ 2b Abs. 2 BEEG). */
  baseYear: TaxYear;
  /** Annual Gewinn from self-employment in the Bemessungszeitraum (§ 2d BEEG). */
  annualProfit: number;
  /** Annual gross salary from employment in the Bemessungszeitraum (§ 2c BEEG). */
  annualEmploymentGross: number;
  insurance: InsuranceStatus;
  churchTaxPercent: ChurchTaxPercent;
  /** Monthly Elterngeld-Netto still earned *during* the leave months (§ 2 Abs. 3 BEEG). */
  monthlyNetIncomeDuringLeave: number;
  /** Two children under 3, or three or more under 6 (§ 2a Abs. 1 BEEG). */
  siblingBonus: boolean;
  /** Additional children of a multiple birth (twins = 1, triplets = 2). */
  multipleBirthExtraChildren: number;
  /** Months of Basiselterngeld drawn (§ 4 BEEG: up to 12, or 14 with Partnermonate). */
  basisMonths: number;
  /** Months of ElterngeldPlus drawn (§ 4a BEEG). */
  plusMonths: number;
}

/**
 * What actually causes the profit difference between two scenarios. This is the
 * single most important switch in the model, because it decides whether the extra
 * declared profit is extra *money* or merely extra *taxable income*.
 *
 *  'timing' — depreciation and valuation elections (Sofortabschreibung vs.
 *             Sammelposten vs. lineare AfA, Betriebsausgabenpauschale vs. actual
 *             costs). These are non-cash: the same euros sit in the account either
 *             way, only the taxable profit moves, and the forgone deductions come
 *             back in later years.
 *  'cash'   — genuinely earning more: more hours, more children in care, a higher
 *             fee. The extra profit really is extra money in hand.
 */
export type ProfitDeltaKind = 'timing' | 'cash';

/**
 * Mutterschaftsgeld from the statutory health insurer. A self-employed person only
 * qualifies after electing the Krankengeld entitlement under § 44 Abs. 2 SGB V,
 * which raises the contribution rate by 0.6 percentage points and binds for years —
 * hence `extraContributionTotal`.
 */
export interface MaternityProfile {
  /** Whether the Krankengeld entitlement (and thus Mutterschaftsgeld) is elected. */
  enabled: boolean;
  weeksBefore: number;
  weeksAfter: number;
  /** Total extra health-insurance contributions over the binding period of the election. */
  extraContributionTotal: number;
}

export interface HouseholdProfile {
  filing: FilingStatus;
  churchTaxPercent: ChurchTaxPercent;
  /** Whether the profit difference between scenarios is cash or merely timing. */
  profitDeltaKind: ProfitDeltaKind;
  /** Children eligible for Kindergeld / Kinderfreibetrag, excluding none. */
  children: number;
  maternity: MaternityProfile;
  /** Tax year in which the parental leave (and the Elterngeld) falls. */
  leaveYear: TaxYear;
  /** Partner's taxable income in the assessment year, 0 when single. */
  partnerIncomeBaseYear: number;
  /** Partner's taxable income in the leave year, 0 when single. */
  partnerIncomeLeaveYear: number;
  /** The applicant's own taxable income in the leave year, besides Elterngeld. */
  applicantIncomeLeaveYear: number;
  /** Sonderausgaben / Vorsorgeaufwendungen deducted from zvE in the assessment year. */
  deductionsBaseYear: number;
  /** Sonderausgaben / Vorsorgeaufwendungen deducted from zvE in the leave year. */
  deductionsLeaveYear: number;
  /**
   * Marginal rate at which deductions postponed out of the assessment year will
   * eventually be usable. Depreciation and write-offs are timing differences, not
   * permanent losses — skipping them now moves them to a later year.
   */
  futureReliefRate: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Elterngeld-Netto (§§ 2c–2f BEEG)
// ─────────────────────────────────────────────────────────────────────────────

export interface ElterngeldNettoBreakdown {
  /** Annual assessment base: profit + employment gross. */
  annualBase: number;
  /** Monthly assessment base = annualBase / 12. */
  monthlyGross: number;
  /** Combined flat social-contribution rate applied under § 2f BEEG. */
  socialRate: number;
  monthlySocialContributions: number;
  /** Vorsorgepauschale used inside the § 2e tax simulation, per year. */
  vorsorgepauschale: number;
  /** Taxable base of the § 2e simulation, per year. */
  taxSimulationBase: number;
  annualTax: number;
  monthlyTax: number;
  /** The "Elterngeld-Netto" the replacement rate is applied to. */
  monthlyNetto: number;
}

/**
 * Vorsorgepauschale of § 39b Abs. 2 Satz 5 Nr. 3 EStG, as referenced by § 2e Abs. 3 BEEG.
 *
 *   VP = Teilbetrag_RV + max(Teilbetrag_KV+PV, Mindestvorsorgepauschale)
 *
 * The pension component only applies to people who are compulsorily insured.
 */
export function vorsorgepauschale(
  annualBase: number,
  insurance: InsuranceStatus,
  year: TaxYear,
): number {
  const tariff = getTariff(year);
  const base = Math.max(0, annualBase);

  const teilRV = insurance.pflichtRV
    ? Math.min(base, tariff.bbgRentenversicherung) * tariff.rvEmployeeRate
    : 0;

  const kvPvRate =
    tariff.kvEmployeeRate +
    tariff.pvEmployeeRate +
    (insurance.childless ? PV_CHILDLESS_SURCHARGE : 0);
  const teilKvPv = insurance.pflichtKV
    ? Math.min(base, tariff.bbgKrankenversicherung) * kvPvRate
    : 0;

  const mindest = Math.min(base * MINDESTVORSORGE_RATE, MINDESTVORSORGE_CAP);

  return teilRV + Math.max(teilKvPv, mindest);
}

/** Combined flat social-contribution rate under § 2f Abs. 1 BEEG. */
export function socialContributionRate(insurance: InsuranceStatus): number {
  return (
    (insurance.pflichtKV ? SV_RATE_KV : 0) +
    (insurance.pflichtRV ? SV_RATE_RV : 0) +
    (insurance.pflichtAV ? SV_RATE_AV : 0)
  );
}

/**
 * Elterngeld-Netto: the monthly income the replacement rate is applied to.
 *
 *   monthlyGross = (Gewinn + Bruttoarbeitslohn) / 12          § 2c, § 2d BEEG
 *   − Sozialabgaben  = monthlyGross × (9 % + 10 % + 2 %)      § 2f BEEG
 *   − Steuern        = (ESt + SolZ + KiSt) / 12               § 2e BEEG
 *
 * The tax step mirrors the Lohnsteuer procedure the Elterngeldstelle uses:
 * Steuerklasse IV (i.e. the Grundtarif), no Werbungskosten beyond the
 * Arbeitnehmer-Pauschbetrag, and the Vorsorgepauschale.
 */
export function elterngeldNetto(profile: ElterngeldProfile): ElterngeldNettoBreakdown {
  const annualBase = Math.max(0, profile.annualProfit) + Math.max(0, profile.annualEmploymentGross);
  const monthlyGross = annualBase / 12;

  const socialRate = socialContributionRate(profile.insurance);
  const monthlySocialContributions = monthlyGross * socialRate;

  // § 2e Abs. 2 BEEG — the Arbeitnehmer-Pauschbetrag only applies to § 2c income.
  const arbeitnehmerPauschbetrag = profile.annualEmploymentGross > 0 ? ARBEITNEHMER_PAUSCHBETRAG : 0;
  const vp = vorsorgepauschale(annualBase, profile.insurance, profile.baseYear);
  const taxSimulationBase = Math.max(0, annualBase - arbeitnehmerPauschbetrag - vp);

  // Steuerklasse IV means the Grundtarif is applied to the individual's own income.
  const tax = calculateTax(taxSimulationBase, {
    tariff: getTariff(profile.baseYear),
    filing: 'single',
    churchTaxPercent: profile.churchTaxPercent,
  });

  const monthlyTax = tax.total / 12;
  const monthlyNetto = Math.max(0, monthlyGross - monthlySocialContributions - monthlyTax);

  return {
    annualBase,
    monthlyGross,
    socialRate,
    monthlySocialContributions,
    vorsorgepauschale: vp,
    taxSimulationBase,
    annualTax: tax.total,
    monthlyTax,
    monthlyNetto,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Elterngeld amount (§ 2, § 2a, § 4a BEEG)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Replacement rate of § 2 Abs. 2 BEEG.
 *
 *   netto <  1,000 €  → 67 % + 0.1 pp per full 2 € below 1,000 €, capped at 100 %
 *   1,000–1,200 €     → 67 %
 *   netto >  1,200 €  → 67 % − 0.1 pp per full 2 € above 1,200 €, floored at 65 %
 */
export function replacementRate(monthlyNetto: number): number {
  if (monthlyNetto < 1_000) {
    const steps = Math.floor((1_000 - monthlyNetto) / 2);
    return Math.min(1, 0.67 + steps * 0.001);
  }
  if (monthlyNetto <= 1_200) return 0.67;
  const steps = Math.floor((monthlyNetto - 1_200) / 2);
  return Math.max(0.65, 0.67 - steps * 0.001);
}

export interface ElterngeldAmount {
  monthlyNetto: number;
  /** Netto after the § 2 Abs. 1 Satz 3 cap of 2,770 €. */
  cappedNetto: number;
  rate: number;
  /** Basiselterngeld before bonuses, after the 300/1,800 € clamp. */
  basisBeforeBonus: number;
  siblingBonus: number;
  multipleBirthSupplement: number;
  basisMonthly: number;
  plusMonthly: number;
  totalBasis: number;
  totalPlus: number;
  total: number;
}

export function elterngeldAmount(profile: ElterngeldProfile, netto: number): ElterngeldAmount {
  const cappedNetto = Math.min(netto, BEMESSUNG_CAP);
  const rate = replacementRate(netto);

  // § 2 Abs. 3 BEEG: with income during the leave months only the difference is replaced.
  const replaceable = Math.max(0, cappedNetto - Math.max(0, profile.monthlyNetIncomeDuringLeave));
  const basisBeforeBonus = Math.min(BASIS_MAX, Math.max(BASIS_MIN, rate * replaceable));

  const siblingBonus = profile.siblingBonus
    ? Math.max(SIBLING_BONUS_MIN, basisBeforeBonus * SIBLING_BONUS_RATE)
    : 0;
  const multipleBirthSupplement =
    Math.max(0, profile.multipleBirthExtraChildren) * MULTIPLE_BIRTH_SUPPLEMENT;

  const basisMonthly = basisBeforeBonus + siblingBonus + multipleBirthSupplement;

  // § 4a Abs. 2 BEEG — half the amount, own floor and ceiling; bonuses are halved too.
  const plusCore = Math.min(PLUS_MAX, Math.max(PLUS_MIN, basisBeforeBonus / 2));
  const plusMonthly = plusCore + siblingBonus / 2 + multipleBirthSupplement / 2;

  const basisMonths = Math.max(0, profile.basisMonths);
  const plusMonths = Math.max(0, profile.plusMonths);
  const totalBasis = basisMonthly * basisMonths;
  const totalPlus = plusMonthly * plusMonths;

  return {
    monthlyNetto: netto,
    cappedNetto,
    rate,
    basisBeforeBonus,
    siblingBonus,
    multipleBirthSupplement,
    basisMonthly,
    plusMonthly,
    totalBasis,
    totalPlus,
    total: totalBasis + totalPlus,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutterschaftsgeld (§ 24i SGB V) and its credit against Elterngeld (§ 3 BEEG)
// ─────────────────────────────────────────────────────────────────────────────

export interface MaternityResult {
  /** Daily Mutterschaftsgeld: 70 % of the contributory income per calendar day. */
  dailyRate: number;
  daysBefore: number;
  daysAfter: number;
  /** Paid before the birth — outside any Lebensmonat, so *not* credited. */
  beforeBirth: number;
  /** Paid after the birth — credited against the Elterngeld of those Lebensmonate. */
  afterBirth: number;
  total: number;
  /** Lebensmonate the post-birth payment covers. */
  monthsOffset: number;
  /** Elterngeld lost to the § 3 Abs. 1 BEEG credit. */
  elterngeldCredited: number;
  extraContributionTotal: number;
  /** Cash gained by electing the entitlement, after the credit and the contributions. */
  netGain: number;
}

/**
 * Mutterschaftsgeld and what it actually adds.
 *
 * The crucial asymmetry: § 3 Abs. 1 BEEG credits other maternity benefits against
 * Elterngeld only "ab dem Tag der Geburt". The six weeks paid *before* the birth fall
 * outside every Lebensmonat and are therefore kept in full on top of the Elterngeld,
 * while the weeks after the birth merely replace Elterngeld euro for euro (Elterngeld
 * is reduced to zero at worst, never below).
 *
 * There is no 300 € exemption here — § 3 Abs. 2 BEEG excludes it where income under
 * Absatz 1 Nr. 1 to 3 is credited, and Mutterschaftsleistungen are Nr. 1.
 */
export function mutterschaftsgeld(
  profile: ElterngeldProfile,
  maternity: MaternityProfile,
  basisMonthly: number,
  taxYear: TaxYear,
): MaternityResult | null {
  if (!maternity.enabled) return null;

  const tariff = getTariff(taxYear);
  // Contributions — and therefore the benefit — stop at the Beitragsbemessungsgrenze.
  const contributoryIncome = Math.min(
    Math.max(0, profile.annualProfit) + Math.max(0, profile.annualEmploymentGross),
    tariff.bbgKrankenversicherung,
  );
  const dailyRate = (MUTTERSCHAFTSGELD_RATE * contributoryIncome) / SV_DAYS_PER_YEAR;

  const daysBefore = Math.max(0, maternity.weeksBefore) * 7;
  const daysAfter = Math.max(0, maternity.weeksAfter) * 7;
  const beforeBirth = dailyRate * daysBefore;
  const afterBirth = dailyRate * daysAfter;

  const monthsOffset = daysAfter / DAYS_PER_LEBENSMONAT;
  // Only months actually drawn as Basiselterngeld can be credited against.
  const creditableMonths = Math.min(monthsOffset, Math.max(0, profile.basisMonths));
  const elterngeldCredited = Math.min(basisMonthly * creditableMonths, afterBirth);

  const extraContributionTotal = Math.max(0, maternity.extraContributionTotal);

  return {
    dailyRate,
    daysBefore,
    daysAfter,
    beforeBirth,
    afterBirth,
    total: beforeBirth + afterBirth,
    monthsOffset,
    elterngeldCredited,
    extraContributionTotal,
    netGain: beforeBirth + afterBirth - elterngeldCredited - extraContributionTotal,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Zusammenveranlagung vs. Einzelveranlagung
// ─────────────────────────────────────────────────────────────────────────────

export interface FilingComparison {
  /** Joint assessment: Splitting applies, but the benefits raise the rate on both incomes. */
  joint: TaxBreakdown;
  /** Separate assessment: the benefits only raise the rate on the recipient's own income. */
  separateApplicant: TaxBreakdown;
  separatePartner: TaxBreakdown;
  separateTotal: number;
  better: FilingStatus;
  /** How much the better option saves. */
  advantage: number;
}

/**
 * Which assessment type costs less in the leave year.
 *
 * Two effects pull in opposite directions. Splitting favours the joint assessment
 * whenever the two incomes differ a lot. Progressionsvorbehalt favours the separate
 * one, because the benefits then only lift the rate on the recipient's own — usually
 * small — income instead of on the couple's combined income. Which wins is not
 * predictable by inspection; it has to be computed both ways.
 */
export function compareFilingStatus(params: {
  applicantIncome: number;
  partnerIncome: number;
  progressionIncome: number;
  taxYear: TaxYear;
  churchTaxPercent: ChurchTaxPercent;
  children: number;
}): FilingComparison {
  const { applicantIncome, partnerIncome, progressionIncome, taxYear, churchTaxPercent, children } =
    params;
  const tariff = getTariff(taxYear);

  const joint = calculateTax(Math.max(0, applicantIncome) + Math.max(0, partnerIncome), {
    tariff,
    filing: 'married',
    churchTaxPercent,
    progressionIncome,
    children,
    childAllowanceShare: 1,
  });

  // Under Einzelveranlagung each parent gets half the Kinderfreibetrag (§ 32 Abs. 6 EStG).
  const separateApplicant = calculateTax(Math.max(0, applicantIncome), {
    tariff,
    filing: 'single',
    churchTaxPercent,
    progressionIncome,
    children,
    childAllowanceShare: 0.5,
  });
  const separatePartner = calculateTax(Math.max(0, partnerIncome), {
    tariff,
    filing: 'single',
    churchTaxPercent,
    progressionIncome: 0,
    children,
    childAllowanceShare: 0.5,
  });

  const separateTotal = separateApplicant.total + separatePartner.total;
  const better: FilingStatus = joint.total <= separateTotal ? 'married' : 'single';

  return {
    joint,
    separateApplicant,
    separatePartner,
    separateTotal,
    better,
    advantage: Math.abs(joint.total - separateTotal),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario evaluation
// ─────────────────────────────────────────────────────────────────────────────

export interface ScenarioResult {
  label: string;
  /** Declared Gewinn in the assessment year. */
  annualProfit: number;
  netto: ElterngeldNettoBreakdown;
  amount: ElterngeldAmount;
  /** zvE of the household in the assessment year. */
  baseYearZvE: number;
  baseYearTax: TaxBreakdown;
  /** Leave-year tax including Progressionsvorbehalt on the Elterngeld. */
  leaveYearTax: TaxBreakdown;
  /** Leave-year tax if the Elterngeld were ignored — the counterfactual. */
  leaveYearTaxWithoutProgression: TaxBreakdown;
  /** Extra leave-year tax caused purely by § 32b EStG. */
  progressionCost: number;
  /** Value of deductions pushed out of the assessment year into later years. */
  deferredDeductionValue: number;
  /** Entitlement is lost above 175,000 € zvE (§ 1 Abs. 8 BEEG). */
  exceedsIncomeLimit: boolean;
  /** Household cash after tax in the assessment year. */
  baseYearNetIncome: number;
  /** Mutterschaftsgeld, or null when the Krankengeld entitlement is not elected. */
  maternity: MaternityResult | null;
  /** Elterngeld actually paid out, after the § 3 BEEG credit. */
  elterngeldAfterCredit: number;
  /** Elterngeld after credit + Mutterschaftsgeld — the § 32b progression base. */
  benefitsTotal: number;
  /** Joint vs. separate assessment in the leave year. */
  filingComparison: FilingComparison;
  /**
   * Bottom line across both years:
   *   base-year income after tax
   * + Elterngeld received (after the § 3 BEEG credit) + Mutterschaftsgeld
   * − extra health-insurance contributions for the Krankengeld election
   * − leave-year tax
   * + later relief for the postponed deductions
   */
  netPosition: number;
}

/**
 * Evaluate one "declare this much profit" scenario end to end.
 *
 * `referenceProfit` is the lowest-profit scenario — the amount by which this
 * scenario exceeds it is the deduction that was postponed rather than lost.
 */
export function evaluateScenario(
  label: string,
  profile: ElterngeldProfile,
  household: HouseholdProfile,
  referenceProfit: number,
): ScenarioResult {
  const netto = elterngeldNetto(profile);
  const amountRaw = elterngeldAmount(profile, netto.monthlyNetto);

  // ── Assessment year: household tax on the declared profit ──
  const baseYearZvE = Math.max(
    0,
    profile.annualProfit +
      profile.annualEmploymentGross +
      household.partnerIncomeBaseYear -
      household.deductionsBaseYear,
  );
  const baseTariff = getTariff(profile.baseYear);
  const baseYearTax = calculateTax(baseYearZvE, {
    tariff: baseTariff,
    filing: household.filing,
    churchTaxPercent: household.churchTaxPercent,
    children: household.children,
  });

  // § 1 Abs. 8 BEEG — above the limit there is no entitlement at all.
  const exceedsIncomeLimit = baseYearZvE > INCOME_LIMIT_ZVE;
  const amount: ElterngeldAmount = exceedsIncomeLimit
    ? { ...amountRaw, basisMonthly: 0, plusMonthly: 0, totalBasis: 0, totalPlus: 0, total: 0 }
    : amountRaw;

  // ── Leave year: Progressionsvorbehalt (§ 32b EStG) ──
  const leaveYearZvE = Math.max(
    0,
    household.applicantIncomeLeaveYear +
      household.partnerIncomeLeaveYear -
      household.deductionsLeaveYear,
  );
  // ── Mutterschaftsgeld and its § 3 BEEG credit against the Elterngeld ──
  const maternity = exceedsIncomeLimit
    ? mutterschaftsgeld(profile, household.maternity, 0, profile.baseYear)
    : mutterschaftsgeld(profile, household.maternity, amount.basisMonthly, profile.baseYear);
  const elterngeldAfterCredit = Math.max(0, amount.total - (maternity?.elterngeldCredited ?? 0));
  const benefitsTotal = elterngeldAfterCredit + (maternity?.total ?? 0);

  const leaveTariff = getTariff(household.leaveYear);
  const leaveTaxOptions = {
    tariff: leaveTariff,
    filing: household.filing,
    churchTaxPercent: household.churchTaxPercent,
    children: household.children,
  };
  const leaveYearTaxWithoutProgression = calculateTax(leaveYearZvE, leaveTaxOptions);
  // Both Elterngeld (§ 32b Abs. 1 Nr. 1 Buchst. j) and Mutterschaftsgeld (Buchst. c)
  // are tax-free but lift the rate on everything else.
  const leaveYearTax = calculateTax(leaveYearZvE, {
    ...leaveTaxOptions,
    progressionIncome: benefitsTotal,
  });
  const progressionCost = leaveYearTax.total - leaveYearTaxWithoutProgression.total;

  const filingComparison = compareFilingStatus({
    applicantIncome: Math.max(0, household.applicantIncomeLeaveYear - household.deductionsLeaveYear),
    partnerIncome: household.partnerIncomeLeaveYear,
    progressionIncome: benefitsTotal,
    taxYear: household.leaveYear,
    churchTaxPercent: household.churchTaxPercent,
    children: household.children,
  });

  // Only a timing election postpones a deduction into a later year; genuinely
  // earning more money does not create anything to claim later.
  const postponedDeductions =
    household.profitDeltaKind === 'timing' ? Math.max(0, profile.annualProfit - referenceProfit) : 0;
  const deferredDeductionValue = postponedDeductions * household.futureReliefRate;

  // Under a timing election the cash in the account is the same in every scenario:
  // depreciation is non-cash, so only the tax bill moves, not the money earned.
  const cashProfit =
    household.profitDeltaKind === 'timing' ? referenceProfit : profile.annualProfit;

  const baseYearNetIncome =
    cashProfit + profile.annualEmploymentGross + household.partnerIncomeBaseYear
    - baseYearTax.total;

  return {
    label,
    annualProfit: profile.annualProfit,
    netto,
    amount,
    baseYearZvE,
    baseYearTax,
    leaveYearTax,
    leaveYearTaxWithoutProgression,
    progressionCost,
    deferredDeductionValue,
    exceedsIncomeLimit,
    baseYearNetIncome,
    maternity,
    elterngeldAfterCredit,
    benefitsTotal,
    filingComparison,
    netPosition:
      baseYearNetIncome +
      benefitsTotal -
      (maternity?.extraContributionTotal ?? 0) -
      leaveYearTax.total +
      deferredDeductionValue,
  };
}

export interface ScenarioDefinition {
  label: string;
  annualProfit: number;
}

export interface ComparisonResult {
  scenarios: ScenarioResult[];
  /** Index of the scenario with the highest netPosition. */
  bestIndex: number;
  /** Index of the lowest-profit scenario, used as the reference. */
  referenceIndex: number;
  /** netPosition advantage of the best scenario over the reference. */
  advantage: number;
}

export function compareScenarios(
  definitions: ScenarioDefinition[],
  profile: ElterngeldProfile,
  household: HouseholdProfile,
): ComparisonResult {
  if (definitions.length === 0) {
    return { scenarios: [], bestIndex: -1, referenceIndex: -1, advantage: 0 };
  }

  const referenceProfit = Math.min(...definitions.map((d) => d.annualProfit));
  const scenarios = definitions.map((d) =>
    evaluateScenario(d.label, { ...profile, annualProfit: d.annualProfit }, household, referenceProfit),
  );

  let bestIndex = 0;
  let referenceIndex = 0;
  scenarios.forEach((s, i) => {
    if (s.netPosition > scenarios[bestIndex].netPosition) bestIndex = i;
    if (s.annualProfit < scenarios[referenceIndex].annualProfit) referenceIndex = i;
  });

  return {
    scenarios,
    bestIndex,
    referenceIndex,
    advantage: scenarios[bestIndex].netPosition - scenarios[referenceIndex].netPosition,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Optimisation sweep
// ─────────────────────────────────────────────────────────────────────────────

export interface SweepPoint {
  annualProfit: number;
  /** Elterngeld after the § 3 BEEG credit, plus Mutterschaftsgeld. */
  benefitsTotal: number;
  baseYearTax: number;
  progressionCost: number;
  netPosition: number;
}

/**
 * Walk the declared profit across a range so the UI can plot the trade-off and
 * locate the optimum. Both effects are step functions (tariff zones, the 2 €
 * replacement-rate steps), so the curve is genuinely kinked — sample it rather
 * than differentiate it.
 */
export function sweepProfit(
  profile: ElterngeldProfile,
  household: HouseholdProfile,
  from: number,
  to: number,
  steps = 60,
): SweepPoint[] {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const count = Math.max(2, Math.floor(steps));
  const points: SweepPoint[] = [];

  for (let i = 0; i < count; i += 1) {
    const annualProfit = lo + ((hi - lo) * i) / (count - 1);
    const result = evaluateScenario('sweep', { ...profile, annualProfit }, household, lo);
    points.push({
      annualProfit,
      benefitsTotal: result.benefitsTotal,
      baseYearTax: result.baseYearTax.total,
      progressionCost: result.progressionCost,
      netPosition: result.netPosition,
    });
  }

  return points;
}

/** The sweep point with the highest net position. */
export function findOptimum(points: SweepPoint[]): SweepPoint | null {
  if (points.length === 0) return null;
  return points.reduce((best, p) => (p.netPosition > best.netPosition ? p : best), points[0]);
}
