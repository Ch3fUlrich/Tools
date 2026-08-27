"use client";

import React from 'react';
import type { ScenarioResult } from '@/lib/local/elterngeld';
import { eur2, percent } from './format';

interface Props {
  low: ScenarioResult;
  high: ScenarioResult;
}

type Row =
  | { kind: 'section'; label: string }
  | { kind: 'value'; label: string; low: number; high: number; format: 'eur' | 'percent' }
  | { kind: 'total'; label: string; low: number; high: number };

const cell: React.CSSProperties = {
  padding: '0.55rem 0.5rem',
  textAlign: 'right',
  borderBottom: '1px solid var(--card-border)',
  fontVariantNumeric: 'tabular-nums',
};

const labelCell: React.CSSProperties = { ...cell, textAlign: 'left', color: 'var(--fg-secondary)' };

/**
 * Side-by-side breakdown of the two options, from declared profit all the way
 * down to the net position across both tax years.
 */
export default function ScenarioTable({ low, high }: Props) {
  const rows: Row[] = [
    { kind: 'section', label: 'Assessment year (Bemessungszeitraum)' },
    { kind: 'value', label: 'Declared profit (Gewinn)', low: low.annualProfit, high: high.annualProfit, format: 'eur' },
    { kind: 'value', label: 'Elterngeld-Netto per month', low: low.netto.monthlyNetto, high: high.netto.monthlyNetto, format: 'eur' },
    { kind: 'value', label: 'Replacement rate', low: low.amount.rate, high: high.amount.rate, format: 'percent' },
    { kind: 'value', label: 'Income tax + SolZ + KiSt', low: -low.baseYearTax.total, high: -high.baseYearTax.total, format: 'eur' },
    { kind: 'section', label: 'Parental leave' },
    { kind: 'value', label: 'Basiselterngeld per month', low: low.amount.basisMonthly, high: high.amount.basisMonthly, format: 'eur' },
    { kind: 'value', label: 'ElterngeldPlus per month', low: low.amount.plusMonthly, high: high.amount.plusMonthly, format: 'eur' },
    { kind: 'value', label: 'Elterngeld before crediting', low: low.amount.total, high: high.amount.total, format: 'eur' },
  ];

  if (low.maternity || high.maternity) {
    rows.push(
      { kind: 'value', label: 'Mutterschaftsgeld (14 wks)', low: low.maternity?.total ?? 0, high: high.maternity?.total ?? 0, format: 'eur' },
      { kind: 'value', label: 'Elterngeld credited away (§ 3 BEEG)', low: -(low.maternity?.elterngeldCredited ?? 0), high: -(high.maternity?.elterngeldCredited ?? 0), format: 'eur' },
      { kind: 'value', label: 'Extra health-insurance contributions', low: -(low.maternity?.extraContributionTotal ?? 0), high: -(high.maternity?.extraContributionTotal ?? 0), format: 'eur' },
    );
  }

  rows.push(
    { kind: 'value', label: 'Benefits received in total', low: low.benefitsTotal, high: high.benefitsTotal, format: 'eur' },
    { kind: 'value', label: 'Progressionsvorbehalt (§ 32b EStG)', low: -low.progressionCost, high: -high.progressionCost, format: 'eur' },
    { kind: 'value', label: 'Later relief on postponed write-offs', low: low.deferredDeductionValue, high: high.deferredDeductionValue, format: 'eur' },
    { kind: 'total', label: 'Net position across both years', low: low.netPosition, high: high.netPosition },
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <caption className="sr-only">
          Comparison of the lower and higher declared profit across the assessment year and the leave year
        </caption>
        <thead>
          <tr>
            <th scope="col" style={{ ...labelCell, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }} />
            <th scope="col" style={{ ...cell, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
              Lower profit
              <div style={{ fontSize: '0.8125rem', textTransform: 'none', letterSpacing: 0, color: 'var(--fg)', fontWeight: 700 }}>
                {eur2(low.annualProfit)}
              </div>
            </th>
            <th scope="col" style={{ ...cell, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
              Higher profit
              <div style={{ fontSize: '0.8125rem', textTransform: 'none', letterSpacing: 0, color: 'var(--fg)', fontWeight: 700 }}>
                {eur2(high.annualProfit)}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            if (row.kind === 'section') {
              return (
                <tr key={row.label}>
                  <td
                    colSpan={3}
                    style={{ padding: '1rem 0.5rem 0.35rem', fontWeight: 700, color: 'var(--fg-secondary)', fontSize: '0.8125rem' }}
                  >
                    {row.label}
                  </td>
                </tr>
              );
            }

            const isTotal = row.kind === 'total';
            const format = isTotal ? eur2 : row.format === 'percent' ? percent : eur2;
            const totalStyle: React.CSSProperties = isTotal
              ? { fontWeight: 800, fontSize: '1rem', borderTop: '2px solid var(--card-border)', borderBottom: 'none' }
              : {};
            const winner = isTotal ? (high.netPosition > low.netPosition ? 'high' : 'low') : null;

            return (
              <tr key={row.label}>
                <th scope="row" style={{ ...labelCell, fontWeight: isTotal ? 800 : 400, ...totalStyle, textAlign: 'left' }}>
                  {row.label}
                </th>
                <td style={{ ...cell, ...totalStyle, color: winner === 'low' ? 'var(--success)' : undefined }}>
                  {format(row.low)}
                </td>
                <td style={{ ...cell, ...totalStyle, color: winner === 'high' ? 'var(--success)' : undefined }}>
                  {format(row.high)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
