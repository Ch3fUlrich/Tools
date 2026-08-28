"use client";

import React from 'react';
import {
  BASIS_MAX,
  BASIS_MIN,
  BEMESSUNG_CAP,
  type HouseholdProfile,
  type ScenarioResult,
} from '@/lib/local/elterngeld';
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
  const n = high.netto;
  const socialPercent = `${(n.socialRate * 100).toFixed(0)} %`;
  const extraTax = high.baseYearTax.total - low.baseYearTax.total;
  const extraElterngeld = high.amount.total - low.amount.total;

  return (
    <div>
      <Note>
        Elterngeld for a self-employed parent is derived from the profit of the{' '}
        <strong style={{ color: 'var(--fg)' }}>last completed tax year before the birth</strong> (§ 2b Abs. 2 BEEG), not
        from the months right before it. That single year is what the write-off decision turns on.
      </Note>

      <Step title="1 · From profit to Elterngeld-Netto (§§ 2c–2f BEEG)" open>
        <Equation>{`monthly gross     = Gewinn / 12
                  = ${eur2(high.annualProfit)} / 12 = ${eur2(n.monthlyGross)}

social deductions = monthly gross × ${socialPercent}
                    (§ 2f: 9 % health + 10 % pension + 2 % unemployment,
                     counted only where insurance is compulsory)
                  = ${eur2(n.monthlySocialContributions)}

tax deductions    = (ESt + SolZ + KiSt) / 12
                    (§ 2e, Steuerklasse IV, after Vorsorgepauschale ${eur2(n.vorsorgepauschale)})
                  = ${eur2(n.monthlyTax)}

Elterngeld-Netto  = ${eur2(n.monthlyGross)} − ${eur2(n.monthlySocialContributions)} − ${eur2(n.monthlyTax)}
                  = ${eur2(n.monthlyNetto)}`}</Equation>
      </Step>

      <Step title="2 · The replacement rate (§ 2 Abs. 2 BEEG)">
        <Equation>{`netto < 1.000 €  →  67 % + 0,1 pp per full 2 € below 1.000 €, up to 100 %
1.000–1.200 €    →  67 %
netto > 1.200 €  →  67 % − 0,1 pp per full 2 € above 1.200 €, down to 65 %
                    (the 65 % floor is reached at 1.240 €)

lower profit:  netto ${eur2(low.netto.monthlyNetto)}  →  ${percent(low.amount.rate)}
higher profit: netto ${eur2(high.netto.monthlyNetto)}  →  ${percent(high.amount.rate)}`}</Equation>
        <Note>
          This is why the gain flattens out. Past €1.240 of Elterngeld-Netto every additional euro is replaced at only
          65 %, and past {eur(BEMESSUNG_CAP)} (§ 2 Abs. 1 Satz 3 BEEG) it is not replaced at all.
        </Note>
      </Step>

      <Step title="3 · The monthly amount (§ 2, § 2a, § 4a BEEG)">
        <Equation>{`Basiselterngeld = clamp(rate × min(netto, ${eur(BEMESSUNG_CAP)}) − net income during leave,
                        ${eur(BASIS_MIN)}, ${eur(BASIS_MAX)})
                + Geschwisterbonus (10 %, at least 75 €)
                + 300 € per further child of a multiple birth

ElterngeldPlus  = clamp(Basiselterngeld / 2, 150 €, 900 €), for twice as many months

higher profit:  ${percent(high.amount.rate)} × ${eur2(high.amount.cappedNetto)} = ${eur2(high.amount.basisBeforeBonus)}
                → ${eur2(high.amount.basisMonthly)} per month × ${basisMonths} = ${eur2(high.amount.totalBasis)}`}</Equation>
      </Step>

      {high.maternity && (
        <Step title="4 · Mutterschaftsgeld and the § 3 BEEG credit">
          <Equation>{`daily rate = 70 % × contributory income / 360
           = 70 % × ${eur2(Math.min(high.annualProfit, 69_750))} / 360 = ${eur2(high.maternity.dailyRate)}

before birth (${high.maternity.daysBefore} days) = ${eur2(high.maternity.beforeBirth)}   ← kept in full
after birth  (${high.maternity.daysAfter} days) = ${eur2(high.maternity.afterBirth)}   ← credited against Elterngeld

Elterngeld credited away = ${eur2(high.maternity.elterngeldCredited)}   (§ 3 Abs. 1 BEEG)
extra contributions      = ${eur2(high.maternity.extraContributionTotal)}
net gain from electing   = ${eur2(high.maternity.netGain)}`}</Equation>
          <Note>
            The asymmetry is what makes this worth doing. § 3 Abs. 1 BEEG only credits maternity benefits
            &ldquo;ab dem Tag der Geburt&rdquo;, so the six weeks paid <strong style={{ color: 'var(--fg)' }}>before</strong>{' '}
            the birth fall outside every Lebensmonat and are kept on top of the Elterngeld. The weeks after the birth
            merely replace Elterngeld euro for euro — and because the credit can only push Elterngeld down to zero,
            never below, anything above it is kept too. There is no 300 € exemption here: § 3 Abs. 2 BEEG excludes it
            where Mutterschaftsleistungen are credited.
          </Note>
          <Note>
            Since the benefit scales with the declared profit, electing Krankengeld makes the case for the higher profit
            stronger, not weaker.
          </Note>
        </Step>
      )}

      <Step title="5 · The cost side — and why it is smaller than it looks">
        <Equation>{`extra income tax = tax(zvE_higher) − tax(zvE_lower)
                 = ${eur2(high.baseYearTax.total)} − ${eur2(low.baseYearTax.total)} = ${eur2(extraTax)}

${
  household.filing === 'married'
    ? 'married: tax(zvE) = 2 × T(zvE / 2)   (Ehegattensplitting, § 32a Abs. 5 EStG)'
    : 'single:  tax(zvE) = T(zvE)           (Grundtarif, § 32a Abs. 1 EStG)'
}`}</Equation>
        <Note>
          {household.profitDeltaKind === 'timing' ? (
            <>
              Depreciation elections are a <strong style={{ color: 'var(--fg)' }}>timing</strong> difference, not a
              permanent one. Skipping a write-off this year does not destroy it — it lands in a later year instead. If
              that later year falls inside parental leave, when the marginal rate is low, the deduction is worth less
              then, which argues further for taking the profit now. The &ldquo;later relief&rdquo; input prices this in.
            </>
          ) : (
            <>
              You entered this as genuine extra earnings, so the additional profit is real money in hand and is counted
              as such in the bottom line.
            </>
          )}
        </Note>
      </Step>

      <Step title="6 · Progressionsvorbehalt (§ 32b EStG)">
        <Equation>{`special rate = tax(zvE + benefits) / (zvE + benefits)
tax due      = special rate × zvE        ← the benefits themselves stay tax-free

benefits = Elterngeld (Abs. 1 Nr. 1 Buchst. j) + Mutterschaftsgeld (Buchst. c)
         = ${eur2(high.benefitsTotal)}

higher profit: ${eur2(high.leaveYearTaxWithoutProgression.total)} → ${eur2(high.leaveYearTax.total)}  (costs ${eur2(high.progressionCost)})`}</Equation>
        <Note>
          Both Elterngeld and Mutterschaftsgeld are tax-free, but they lift the rate applied to every other euro the
          household earns in the leave year. With no other income in that year it costs nothing — which is exactly why a
          partner&rsquo;s salary matters here, and why the joint-or-separate question above is worth checking.
        </Note>
      </Step>

      <Step title="7 · The bottom line">
        <Equation>{`net position = base-year income after tax
             + Elterngeld after the § 3 BEEG credit + Mutterschaftsgeld
             − extra health-insurance contributions
             − leave-year tax (incl. Progressionsvorbehalt)
             + later relief on postponed write-offs

lower profit:  ${eur2(low.netPosition)}
higher profit: ${eur2(high.netPosition)}
difference:    ${eur2(high.netPosition - low.netPosition)}`}</Equation>
        <Note>
          The higher profit buys {eur2(extraElterngeld)} of extra Elterngeld for {eur2(extraTax)} of extra income tax
          {high.maternity ? `, plus ${eur2(high.maternity.netGain - (low.maternity?.netGain ?? 0))} more from the Mutterschaftsgeld` : ''}.
        </Note>
      </Step>
    </div>
  );
}
