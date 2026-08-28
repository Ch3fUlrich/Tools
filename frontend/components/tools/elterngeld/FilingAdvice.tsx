"use client";

import React from 'react';
import { useTranslation } from '@/components/i18n/LanguageProvider';
import type { FilingComparison } from '@/lib/local/elterngeld';
import { eur2 } from './format';

interface Props {
  comparison: FilingComparison;
  /** Total tax-free benefits driving the Progressionsvorbehalt. */
  benefitsTotal: number;
}

const cell: React.CSSProperties = {
  padding: '0.55rem 0.5rem',
  textAlign: 'right',
  borderBottom: '1px solid var(--card-border)',
  fontVariantNumeric: 'tabular-nums',
};

const labelCell: React.CSSProperties = { ...cell, textAlign: 'left', color: 'var(--fg-secondary)' };

/**
 * Zusammenveranlagung vs. Einzelveranlagung in the leave year — the two effects
 * pull in opposite directions, so the answer has to be computed, not guessed.
 */
export default function FilingAdvice({ comparison, benefitsTotal }: Props) {
  const { t } = useTranslation();
  const { joint, separateApplicant, separatePartner, separateTotal, better, advantage } = comparison;
  const jointWins = better === 'married';

  return (
    <div>
      <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
        Splitting pulls towards a joint assessment whenever the two incomes differ a lot.
        Progressionsvorbehalt pulls the other way, because filing separately confines the rate
        increase from {eur2(benefitsTotal)} of tax-free benefits to the recipient&rsquo;s own income.
      </p>

      <div
        className="rounded-xl mb-4"
        style={{
          background: jointWins
            ? 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(16,185,129,0.05))'
            : 'linear-gradient(135deg, rgba(59,130,246,0.14), rgba(59,130,246,0.05))',
          border: `1px solid ${jointWins ? 'rgba(16,185,129,0.35)' : 'rgba(59,130,246,0.35)'}`,
          padding: '0.875rem 1rem',
        }}
      >
        <div style={{ fontWeight: 700, color: 'var(--fg)', fontSize: '0.9375rem' }}>
          {jointWins ? t('eg.filingJoint') : t('eg.filingSeparate')}
        </div>
        <div className="text-sm" style={{ color: 'var(--fg-secondary)', marginTop: '0.25rem' }}>
          {advantage < 1 ? t('eg.filingTie') : t('eg.filingSaves', { amount: eur2(advantage) })}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <caption className="sr-only">{t('eg.filingCaption')}</caption>
          <thead>
            <tr>
              <th scope="col" style={{ ...labelCell, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }} />
              <th scope="col" style={{ ...cell, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                {t('eg.filingTogether')}
              </th>
              <th scope="col" style={{ ...cell, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                {t('eg.filingSeparately')}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" style={labelCell}>{t('eg.filingParent')}</th>
              <td style={cell}>—</td>
              <td style={cell}>{eur2(separateApplicant.total)}</td>
            </tr>
            <tr>
              <th scope="row" style={labelCell}>{t('eg.filingPartner')}</th>
              <td style={cell}>—</td>
              <td style={cell}>{eur2(separatePartner.total)}</td>
            </tr>
            <tr>
              <th scope="row" style={{ ...labelCell, fontWeight: 800, borderTop: '2px solid var(--card-border)', borderBottom: 'none' }}>
                {t('eg.filingTotal')}
              </th>
              <td
                style={{
                  ...cell,
                  fontWeight: 800,
                  borderTop: '2px solid var(--card-border)',
                  borderBottom: 'none',
                  color: jointWins ? 'var(--success)' : undefined,
                }}
              >
                {eur2(joint.total)}
              </td>
              <td
                style={{
                  ...cell,
                  fontWeight: 800,
                  borderTop: '2px solid var(--card-border)',
                  borderBottom: 'none',
                  color: jointWins ? undefined : 'var(--success)',
                }}
              >
                {eur2(separateTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <pre
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '0.75rem',
          lineHeight: 1.6,
          background: 'var(--bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '0.5rem',
          padding: '0.75rem 0.875rem',
          marginTop: '0.875rem',
          overflowX: 'auto',
          color: 'var(--fg-secondary)',
          whiteSpace: 'pre',
        }}
      >{`together:   tax = 2 × T((own + partner) / 2)   at the rate from (own + partner + benefits)
separately: tax = T(own) at the rate from (own + benefits)
                + T(partner) at its own rate — the benefits never touch it

Kinderfreibetrag: full under a joint assessment, half each when filing separately
                  (§ 32 Abs. 6 EStG)`}</pre>
    </div>
  );
}
