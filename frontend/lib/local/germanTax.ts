// German income-tax primitives (§ 32a EStG, SolZG 1995, § 32b EStG).
//
// Pure functions, no I/O. Every constant is sourced from the statute so the
// Elterngeld model in `elterngeld.ts` can be audited line by line.

export type TaxYear = 2025 | 2026;

/** Einzelveranlagung vs. Zusammenveranlagung (Ehegattensplitting, § 32a Abs. 5 EStG). */
export type FilingStatus = 'single' | 'married';

/** Kirchensteuersatz in percent: 0 = no church, 8 = BY/BW, 9 = rest. */
export type ChurchTaxPercent = 0 | 8 | 9;

/**
 * Piecewise-polynomial income tax tariff of § 32a Abs. 1 EStG.
 *
 *   zone 1: zvE <= grundfreibetrag  -> 0
 *   zone 2: zvE <= zone2Upper       -> (z2a * y + z2b) * y
 *   zone 3: zvE <= zone3Upper       -> (z3a * z + z3b) * z + z3c
 *   zone 4: zvE <= zone4Upper       -> z4Rate * zvE - z4Offset
 *   zone 5: otherwise               -> z5Rate * zvE - z5Offset
 *
 * with y = (zvE - grundfreibetrag) / 10_000 and z = (zvE - zone2Upper) / 10_000.
 */
export interface TaxTariff {
  readonly year: TaxYear;
  readonly grundfreibetrag: number;
  readonly zone2Upper: number;
  readonly zone3Upper: number;
  readonly zone4Upper: number;
  readonly z2a: number;
  readonly z2b: number;
  readonly z3a: number;
  readonly z3b: number;
  readonly z3c: number;
  readonly z4Rate: number;
  readonly z4Offset: number;
  readonly z5Rate: number;
  readonly z5Offset: number;
  /** Solidaritätszuschlag Freigrenze on the assessed income tax, Einzelveranlagung. */
  readonly soliFreigrenzeSingle: number;
  /** Solidaritätszuschlag Freigrenze on the assessed income tax, Zusammenveranlagung. */
  readonly soliFreigrenzeMarried: number;
  /** Beitragsbemessungsgrenze Rentenversicherung, per year. */
  readonly bbgRentenversicherung: number;
  /** Beitragsbemessungsgrenze Kranken-/Pflegeversicherung, per year. */
  readonly bbgKrankenversicherung: number;
  /** Employee share of statutory health insurance incl. half the average Zusatzbeitrag. */
  readonly kvEmployeeRate: number;
  /** Employee share of statutory long-term care insurance. */
  readonly pvEmployeeRate: number;
  /** Employee share of statutory pension insurance (half of 18.6 %). */
  readonly rvEmployeeRate: number;
  /** Full Kinderfreibetrag per child for both parents together (§ 32 Abs. 6 EStG), incl. BEA. */
  readonly kinderfreibetragFull: number;
  /** Kindergeld per child per month (§ 66 EStG). */
  readonly kindergeldMonthly: number;
}

/** § 32a Abs. 1 EStG in the version applicable to Veranlagungszeitraum 2025. */
export const TARIFF_2025: TaxTariff = {
  year: 2025,
  grundfreibetrag: 12_096,
  zone2Upper: 17_443,
  zone3Upper: 68_480,
  zone4Upper: 277_825,
  z2a: 932.3,
  z2b: 1_400,
  z3a: 176.64,
  z3b: 2_397,
  z3c: 1_015.13,
  z4Rate: 0.42,
  z4Offset: 10_911.92,
  z5Rate: 0.45,
  z5Offset: 19_246.67,
  soliFreigrenzeSingle: 19_950,
  soliFreigrenzeMarried: 39_900,
  bbgRentenversicherung: 96_600,
  bbgKrankenversicherung: 66_150,
  // (14.6 % general rate + 2.5 % average Zusatzbeitrag) / 2
  kvEmployeeRate: 0.0855,
  // 3.6 % / 2
  pvEmployeeRate: 0.018,
  // 18.6 % / 2
  rvEmployeeRate: 0.093,
  // 6.672 EUR Kinderfreibetrag + 2.928 EUR BEA-Freibetrag
  kinderfreibetragFull: 9_600,
  kindergeldMonthly: 255,
};

/** § 32a Abs. 1 EStG in the version applicable to Veranlagungszeitraum 2026 and later. */
export const TARIFF_2026: TaxTariff = {
  year: 2026,
  grundfreibetrag: 12_348,
  zone2Upper: 17_799,
  zone3Upper: 69_878,
  zone4Upper: 277_825,
  z2a: 914.51,
  z2b: 1_400,
  z3a: 173.1,
  z3b: 2_397,
  z3c: 1_034.87,
  z4Rate: 0.42,
  z4Offset: 11_135.63,
  z5Rate: 0.45,
  z5Offset: 19_470.38,
  soliFreigrenzeSingle: 20_350,
  soliFreigrenzeMarried: 40_700,
  bbgRentenversicherung: 101_400,
  bbgKrankenversicherung: 69_750,
  // (14.6 % general rate + 2.9 % average Zusatzbeitrag) / 2
  kvEmployeeRate: 0.0875,
  pvEmployeeRate: 0.018,
  rvEmployeeRate: 0.093,
  kinderfreibetragFull: 9_756,
  kindergeldMonthly: 259,
};

export const TARIFFS: Record<TaxYear, TaxTariff> = {
  2025: TARIFF_2025,
  2026: TARIFF_2026,
};

export function getTariff(year: TaxYear): TaxTariff {
  return TARIFFS[year] ?? TARIFF_2026;
}

/**
 * Tarifliche Einkommensteuer nach dem Grundtarif (§ 32a Abs. 1 EStG).
 * `zvE` is rounded down to full euros first; the resulting tax is rounded
 * down to full euros as the statute requires.
 */
export function grundtarifTax(zvE: number, tariff: TaxTariff): number {
  const x = Math.floor(Math.max(0, zvE));

  if (x <= tariff.grundfreibetrag) return 0;

  if (x <= tariff.zone2Upper) {
    const y = (x - tariff.grundfreibetrag) / 10_000;
    return Math.floor((tariff.z2a * y + tariff.z2b) * y);
  }

  if (x <= tariff.zone3Upper) {
    const z = (x - tariff.zone2Upper) / 10_000;
    return Math.floor((tariff.z3a * z + tariff.z3b) * z + tariff.z3c);
  }

  if (x <= tariff.zone4Upper) {
    return Math.floor(tariff.z4Rate * x - tariff.z4Offset);
  }

  return Math.floor(tariff.z5Rate * x - tariff.z5Offset);
}

/**
 * Tarifliche Einkommensteuer including Ehegattensplitting (§ 32a Abs. 5 EStG):
 * married couples pay twice the tax on half of their joint taxable income.
 */
export function incomeTax(zvE: number, tariff: TaxTariff, filing: FilingStatus): number {
  if (filing === 'married') {
    return 2 * grundtarifTax(zvE / 2, tariff);
  }
  return grundtarifTax(zvE, tariff);
}

/**
 * Solidaritätszuschlag (§ 4 SolZG 1995): 5.5 % of the assessed income tax, but
 * zero below the Freigrenze and capped inside the Milderungszone at 11.9 % of
 * the amount exceeding the Freigrenze.
 */
export function solidaritySurcharge(
  assessedIncomeTax: number,
  tariff: TaxTariff,
  filing: FilingStatus,
): number {
  const freigrenze =
    filing === 'married' ? tariff.soliFreigrenzeMarried : tariff.soliFreigrenzeSingle;

  if (assessedIncomeTax <= freigrenze) return 0;

  return Math.min(0.055 * assessedIncomeTax, 0.119 * (assessedIncomeTax - freigrenze));
}

/** Kirchensteuer as a percentage of the assessed income tax. */
export function churchTax(assessedIncomeTax: number, percent: ChurchTaxPercent): number {
  return assessedIncomeTax * (percent / 100);
}

export interface TaxBreakdown {
  /** Taxable income the tariff was applied to. */
  zvE: number;
  /** Average rate applied to zvE — differs from the plain tariff rate under Progressionsvorbehalt. */
  effectiveRate: number;
  einkommensteuer: number;
  solidaritaetszuschlag: number;
  kirchensteuer: number;
  total: number;
  /** Kinderfreibetrag actually deducted — 0 when Kindergeld was the better option. */
  kinderfreibetragUsed: number;
  /** Kindergeld the household receives for these children over the year. */
  kindergeld: number;
}

export interface TaxOptions {
  tariff: TaxTariff;
  filing: FilingStatus;
  churchTaxPercent: ChurchTaxPercent;
  /**
   * Tax-free income subject to Progressionsvorbehalt (§ 32b EStG) — e.g. Elterngeld
   * (Abs. 1 Nr. 1 Buchst. j) or Mutterschaftsgeld (Buchst. c). Raises the rate applied
   * to `zvE` without being taxed itself.
   */
  progressionIncome?: number;
  /** Number of children eligible for Kinderfreibetrag / Kindergeld. */
  children?: number;
  /**
   * Share of the full Kinderfreibetrag this assessment gets: 1 for a joint assessment
   * (both parents), 0.5 for one parent under Einzelveranlagung (§ 32 Abs. 6 EStG).
   */
  childAllowanceShare?: number;
}

/** Assessed income tax and the average rate it implies, under Progressionsvorbehalt. */
function assess(base: number, tariff: TaxTariff, filing: FilingStatus, progressionIncome: number) {
  if (progressionIncome > 0 && base > 0) {
    const combined = base + progressionIncome;
    const taxOnCombined = incomeTax(combined, tariff, filing);
    // § 32b: the special rate is rounded to four decimal places before it is applied.
    const rate = Math.round((taxOnCombined / combined) * 10_000) / 10_000;
    return { tax: Math.floor(rate * base), rate };
  }
  const tax = incomeTax(base, tariff, filing);
  return { tax, rate: base > 0 ? tax / base : 0 };
}

/**
 * Full tax bill on a taxable income, optionally under Progressionsvorbehalt and
 * with children.
 *
 * § 32b Abs. 2 EStG: the special rate is the average rate that *would* apply to
 * (zvE + tax-free benefits); that rate is then applied to zvE alone.
 *
 * § 31 EStG Günstigerprüfung: the Kinderfreibetrag is only deducted when it beats
 * the Kindergeld; if it is applied, the Kindergeld is added back to the tax.
 * § 51a Abs. 2a EStG: Solidaritätszuschlag and Kirchensteuer are *always* computed
 * on the tax after deducting the Kinderfreibeträge, whichever way that check falls.
 */
export function calculateTax(zvE: number, options: TaxOptions): TaxBreakdown {
  const {
    tariff,
    filing,
    churchTaxPercent,
    progressionIncome = 0,
    children = 0,
    childAllowanceShare = 1,
  } = options;
  const base = Math.max(0, zvE);

  const withoutAllowance = assess(base, tariff, filing, progressionIncome);

  const kinderfreibetrag = Math.max(0, children) * tariff.kinderfreibetragFull * childAllowanceShare;
  const kindergeld = Math.max(0, children) * tariff.kindergeldMonthly * 12 * childAllowanceShare;

  let einkommensteuer = withoutAllowance.tax;
  let effectiveRate = withoutAllowance.rate;
  let kinderfreibetragUsed = 0;
  // § 51a: the surcharge base ignores the Günstigerprüfung outcome.
  let surchargeBase = withoutAllowance.tax;

  if (kinderfreibetrag > 0) {
    const withAllowance = assess(
      Math.max(0, base - kinderfreibetrag),
      tariff,
      filing,
      progressionIncome,
    );
    surchargeBase = withAllowance.tax;

    if (withoutAllowance.tax - withAllowance.tax > kindergeld) {
      einkommensteuer = withAllowance.tax + kindergeld; // Hinzurechnung, § 31 Satz 5 EStG
      effectiveRate = withAllowance.rate;
      kinderfreibetragUsed = kinderfreibetrag;
    }
  }

  const solidaritaetszuschlag = solidaritySurcharge(surchargeBase, tariff, filing);
  const kirchensteuer = churchTax(surchargeBase, churchTaxPercent);

  return {
    zvE: base,
    effectiveRate,
    einkommensteuer,
    solidaritaetszuschlag,
    kirchensteuer,
    total: einkommensteuer + solidaritaetszuschlag + kirchensteuer,
    kinderfreibetragUsed,
    kindergeld,
  };
}

/**
 * Burden of additional taxable income, measured over a finite step so it stays
 * meaningful across tariff-zone boundaries rather than at a single point.
 */
export function marginalTaxRate(zvE: number, options: TaxOptions, step = 100): number {
  const lower = calculateTax(zvE, options).total;
  const upper = calculateTax(zvE + step, options).total;
  return (upper - lower) / step;
}
