import { describe, expect, it } from 'vitest';
import {
  SNAPSHOT_VERSION,
  fromPayload,
  toPayload,
  type ElterngeldSnapshot,
} from '@/components/tools/elterngeld/scenarioState';

const snapshot: ElterngeldSnapshot = {
  filing: 'single',
  profitDeltaKind: 'cash',
  baseYear: 2025,
  leaveYear: 2026,
  profitLow: '30000',
  profitHigh: '60000',
  employmentGross: '12000',
  relief: '900',
  prepaidBase: '100',
  prepaidLeave: '200',
  partnerBase: '300',
  partnerLeave: '400',
  ownLeave: '500',
  pflichtKV: true,
  pflichtRV: false,
  pflichtAV: true,
  childless: true,
  children: '2',
  maternityEnabled: true,
  weeksBefore: '6',
  weeksAfter: '8',
  extraContribution: '50',
  basisMonths: '12',
  plusMonths: '4',
  duringLeave: '1000',
  multiples: '1',
  siblingBonus: true,
};

describe('elterngeld scenario payloads', () => {
  it('round-trips every field', () => {
    expect(fromPayload(toPayload(snapshot))).toEqual(snapshot);
  });

  it('stamps the payload with a version so old saves stay identifiable', () => {
    expect(toPayload(snapshot).version).toBe(SNAPSHOT_VERSION);
  });

  it('ignores fields it does not recognise instead of failing the whole load', () => {
    const loaded = fromPayload({ ...toPayload(snapshot), someFutureField: 'hello' });
    expect(loaded.profitLow).toBe('30000');
    expect(loaded).not.toHaveProperty('someFutureField');
  });

  it('omits a field of the wrong type so the form keeps its current value', () => {
    const loaded = fromPayload({
      ...toPayload(snapshot),
      profitLow: { nope: true },
      pflichtKV: 'yes',
    });
    expect(loaded).not.toHaveProperty('profitLow');
    expect(loaded).not.toHaveProperty('pflichtKV');
    // …while the rest still loads.
    expect(loaded.profitHigh).toBe('60000');
  });

  it('accepts a number where the form keeps a string', () => {
    expect(fromPayload({ profitLow: 41000 }).profitLow).toBe('41000');
    expect(fromPayload({ profitLow: Number.NaN })).not.toHaveProperty('profitLow');
  });

  it('rejects union values that are not part of the union', () => {
    const loaded = fromPayload({ filing: 'divorced', profitDeltaKind: 'nope', baseYear: 1999 });
    expect(loaded).toEqual({});
  });

  it('accepts a year sent as a string', () => {
    expect(fromPayload({ baseYear: '2026' }).baseYear).toBe(2026);
  });

  it('treats a non-object payload as empty rather than throwing', () => {
    expect(fromPayload(null)).toEqual({});
    expect(fromPayload('nope')).toEqual({});
    expect(fromPayload([1, 2, 3])).toEqual({});
    expect(fromPayload(undefined)).toEqual({});
  });
});
