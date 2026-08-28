"use client";

import React from 'react';
import {
  BASIS_MAX,
  BASIS_MIN,
  BEMESSUNG_CAP,
  type HouseholdProfile,
  type ScenarioResult,
} from '@/lib/local/elterngeld';
import { useTranslation } from '@/components/i18n/LanguageProvider';
import { eur, eur2, percent } from './format';

interface Props {
  low: ScenarioResult;
  high: ScenarioResult;
  household: HouseholdProfile;
  basisMonths: number;
}

function Equation({ children }: { children: React.ReactNode }) {
  return (
    <pre
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '0.75rem',
        lineHeight: 1.6,
        background: 'var(--bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '0.5rem',
        padding: '0.75rem 0.875rem',
        margin: '0.5rem 0',
        overflowX: 'auto',
        color: 'var(--fg-secondary)',
        whiteSpace: 'pre',
      }}
    >
      {children}
    </pre>
  );
}

function Step({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details
      open={open}
      style={{
        border: '1px solid var(--card-border)',
        borderRadius: '0.625rem',
        padding: '0.625rem 0.875rem',
        marginBottom: '0.625rem',
        background: 'var(--card-bg)',
      }}
    >
      <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--fg)' }}>{title}</summary>
      <div style={{ marginTop: '0.5rem' }}>{children}</div>
    </details>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm" style={{ color: 'var(--muted)', margin: '0.5rem 0' }}>
      {children}
    </p>
  );
}

/**
 * The reasoning behind the recommendation, with the actual equations and the
 * caller's own numbers substituted in, so the result can be checked by hand.
 */
export default function MethodNotes({ low, high, household, basisMonths }: Props) {
  const { t } = useTranslation();
  const n = high.netto;
  const socialPercent = `${(n.socialRate * 100).toFixed(0)} %`;
  const extraTax = high.baseYearTax.total - low.baseYearTax.total;
  const extraElterngeld = high.amount.total - low.amount.total;

  return (
    <div>
      <Note>
        {t('eg.intro')}
      </Note>

      <Step title={t('eg.step1')} open>
        <Equation>{`monthly gross     = Gewinn / 12
                  = ${eur2(high.annualProfit)} / 12 = ${eur2(n.monthlyGross)}

social deductions = monthly gross × ${socialPercent}
                    (§ 2f: 9 % health + 10 % pension + 2 % unemployment,
                     counted only where insurance is compulsory)
                  = ${eur2(n.monthlySocialContributions)}

tax deductions    = (ESt + SolZ) / 12
                    (§ 2e, Steuerklasse IV, after Vorsorgepauschale ${eur2(n.vorsorgepauschale)})
                  = ${eur2(n.monthlyTax)}

Elterngeld-Netto  = ${eur2(n.monthlyGross)} − ${eur2(n.monthlySocialContributions)} − ${eur2(n.monthlyTax)}
                  = ${eur2(n.monthlyNetto)}`}</Equation>
      </Step>

      <Step title={t('eg.step2')}>
        <Equation>{`netto < 1.000 €  →  67 % + 0,1 pp per full 2 € below 1.000 €, up to 100 %
1.000–1.200 €    →  67 %
netto > 1.200 €  →  67 % − 0,1 pp per full 2 € above 1.200 €, down to 65 %
                    (the 65 % floor is reached at 1.240 €)

lower profit:  netto ${eur2(low.netto.monthlyNetto)}  →  ${percent(low.amount.rate)}
higher profit: netto ${eur2(high.netto.monthlyNetto)}  →  ${percent(high.amount.rate)}`}</Equation>
        <Note>
          {t('eg.step2Note', { cap: eur(BEMESSUNG_CAP) })}
        </Note>
      </Step>

      <Step title={t('eg.step3')}>
        <Equation>{`Basiselterngeld = clamp(rate × min(netto, ${eur(BEMESSUNG_CAP)}) − net income during leave,
                        ${eur(BASIS_MIN)}, ${eur(BASIS_MAX)})
                + Geschwisterbonus (10 %, at least 75 €)
                + 300 € per further child of a multiple birth

ElterngeldPlus  = clamp(Basiselterngeld / 2, 150 €, 900 €), for twice as many months

higher profit:  ${percent(high.amount.rate)} × ${eur2(high.amount.cappedNetto)} = ${eur2(high.amount.basisBeforeBonus)}
                → ${eur2(high.amount.basisMonthly)} per month × ${basisMonths} = ${eur2(high.amount.totalBasis)}`}</Equation>
      </Step>

      {high.maternity && (
        <Step title={t('eg.step4')}>
          <Equation>{`daily rate = 70 % × contributory income / 360
           = 70 % × ${eur2(Math.min(high.annualProfit, 69_750))} / 360 = ${eur2(high.maternity.dailyRate)}

before birth (${high.maternity.daysBefore} days) = ${eur2(high.maternity.beforeBirth)}   ← kept in full
after birth  (${high.maternity.daysAfter} days) = ${eur2(high.maternity.afterBirth)}   ← credited against Elterngeld

Elterngeld credited away = ${eur2(high.maternity.elterngeldCredited)}   (§ 3 Abs. 1 BEEG)
extra contributions      = ${eur2(high.maternity.extraContributionTotal)}
net gain from electing   = ${eur2(high.maternity.netGain)}`}</Equation>
          <Note>
            {t('eg.step4Note')}
          </Note>
          <Note>
            {t('eg.step4Note2')}
          </Note>
        </Step>
      )}

      <Step title={t('eg.step5')}>
        <Equation>{`extra income tax = tax(zvE_higher) − tax(zvE_lower)
                 = ${eur2(high.baseYearTax.total)} − ${eur2(low.baseYearTax.total)} = ${eur2(extraTax)}

${
  household.filing === 'married'
    ? 'married: tax(zvE) = 2 × T(zvE / 2)   (Ehegattensplitting, § 32a Abs. 5 EStG)'
    : 'single:  tax(zvE) = T(zvE)           (Grundtarif, § 32a Abs. 1 EStG)'
}`}</Equation>
        <Note>
          {household.profitDeltaKind === 'timing' ? (
            t('eg.step5NoteTiming')
          ) : (
            t('eg.step5NoteCash')
          )}
        </Note>
      </Step>

      <Step title={t('eg.step6')}>
        <Equation>{`special rate = tax(zvE + benefits) / (zvE + benefits)
tax due      = special rate × zvE        ← the benefits themselves stay tax-free

benefits = Elterngeld (Abs. 1 Nr. 1 Buchst. j) + Mutterschaftsgeld (Buchst. c)
         = ${eur2(high.benefitsTotal)}

higher profit: ${eur2(high.leaveYearTaxWithoutProgression.total)} → ${eur2(high.leaveYearTax.total)}  (costs ${eur2(high.progressionCost)})`}</Equation>
        <Note>
          {t('eg.step6Note')}
        </Note>
      </Step>

      <Step title={t('eg.step7')}>
        <Equation>{`net position = base-year income after tax
             + Elterngeld after the § 3 BEEG credit + Mutterschaftsgeld
             − extra health-insurance contributions
             − leave-year tax (incl. Progressionsvorbehalt)
             + later relief on postponed write-offs

lower profit:  ${eur2(low.netPosition)}
higher profit: ${eur2(high.netPosition)}
difference:    ${eur2(high.netPosition - low.netPosition)}`}</Equation>
        <Note>
          {t('eg.step7Note', { benefit: eur2(extraElterngeld), tax: eur2(extraTax) })}
          {high.maternity
            ? t('eg.step7NoteMaternity', {
                amount: eur2(high.maternity.netGain - (low.maternity?.netGain ?? 0)),
              })
            : ''}
        </Note>
      </Step>
    </div>
  );
}
