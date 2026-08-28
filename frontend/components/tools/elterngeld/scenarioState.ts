import type { ProfitDeltaKind } from '@/lib/local/elterngeld';
import type { FilingStatus, TaxYear } from '@/lib/local/germanTax';

/**
 * Bumped whenever the field set changes in a way older saves cannot satisfy. Stored with
 * every payload so {@link fromPayload} can tell "an old save" from "a corrupt one".
 */
export const SNAPSHOT_VERSION = 1;

/** Every input the optimizer form holds, in the shape the component keeps it. */
export interface ElterngeldSnapshot {
  filing: FilingStatus;
  profitDeltaKind: ProfitDeltaKind;
  baseYear: TaxYear;
  leaveYear: TaxYear;

  profitLow: string;
  profitHigh: string;
  employmentGross: string;
  relief: string;

  prepaidBase: string;
  prepaidLeave: string;

  partnerBase: string;
  partnerLeave: string;
  ownLeave: string;

  pflichtKV: boolean;
  pflichtRV: boolean;
  pflichtAV: boolean;
  childless: boolean;

  children: string;
  maternityEnabled: boolean;
  weeksBefore: string;
  weeksAfter: string;
  extraContribution: string;

  basisMonths: string;
  plusMonths: string;
  duringLeave: string;
  multiples: string;
  siblingBonus: boolean;
}

const TEXT_FIELDS = [
  'profitLow',
  'profitHigh',
  'employmentGross',
  'relief',
  'prepaidBase',
  'prepaidLeave',
  'partnerBase',
  'partnerLeave',
  'ownLeave',
  'children',
  'weeksBefore',
  'weeksAfter',
  'extraContribution',
  'basisMonths',
  'plusMonths',
  'duringLeave',
  'multiples',
] as const satisfies readonly (keyof ElterngeldSnapshot)[];

const BOOLEAN_FIELDS = [
  'pflichtKV',
  'pflichtRV',
  'pflichtAV',
  'childless',
  'maternityEnabled',
  'siblingBonus',
] as const satisfies readonly (keyof ElterngeldSnapshot)[];

const FILING_VALUES: readonly FilingStatus[] = ['single', 'married'];
const DELTA_VALUES: readonly ProfitDeltaKind[] = ['timing', 'cash'];
const YEAR_VALUES: readonly TaxYear[] = [2025, 2026];

/** The snapshot as it goes over the wire — a plain JSON object plus its version stamp. */
export function toPayload(snapshot: ElterngeldSnapshot): Record<string, unknown> {
  return { ...snapshot, version: SNAPSHOT_VERSION };
}

/**
 * Read a stored payload back into form state.
 *
 * Deliberately tolerant and field-by-field: the payload is whatever was saved, possibly by
 * an older version of this tool, and one unrecognised field must not throw away the other
 * twenty-five. Anything missing or of the wrong type is simply left out, so the caller keeps
 * its current value for that field.
 */
export function fromPayload(payload: unknown): Partial<ElterngeldSnapshot> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return {};
  const raw = payload as Record<string, unknown>;
  const out: Partial<ElterngeldSnapshot> = {};

  for (const key of TEXT_FIELDS) {
    const value = raw[key];
    // Numbers are accepted as well as strings: a hand-written or older payload may well
    // carry `12` where the form keeps `"12"`, and rejecting that helps nobody.
    if (typeof value === 'string') out[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value)) out[key] = String(value);
  }

  for (const key of BOOLEAN_FIELDS) {
    if (typeof raw[key] === 'boolean') out[key] = raw[key] as boolean;
  }

  if (FILING_VALUES.includes(raw.filing as FilingStatus)) out.filing = raw.filing as FilingStatus;
  if (DELTA_VALUES.includes(raw.profitDeltaKind as ProfitDeltaKind)) {
    out.profitDeltaKind = raw.profitDeltaKind as ProfitDeltaKind;
  }
  for (const key of ['baseYear', 'leaveYear'] as const) {
    const year = typeof raw[key] === 'string' ? Number(raw[key]) : raw[key];
    if (YEAR_VALUES.includes(year as TaxYear)) out[key] = year as TaxYear;
  }

  return out;
}
