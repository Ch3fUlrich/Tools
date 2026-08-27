"use client";

import React, { useMemo, useState } from 'react';
import CardSection from '@/components/ui/CardSection';
import ErrorAlert from '@/components/ui/ErrorAlert';
import ModernCheckbox from '@/components/ui/ModernCheckbox';
import NumberInput from '@/components/ui/NumberInput';
import {
  BEMESSUNG_CAP,
  INCOME_LIMIT_ZVE,
  compareScenarios,
  findOptimum,
  sweepProfit,
  type ElterngeldProfile,
  type HouseholdProfile,
  type ProfitDeltaKind,
} from '@/lib/local/elterngeld';
import type { ChurchTaxPercent, FilingStatus, TaxYear } from '@/lib/local/germanTax';
import MethodNotes from './elterngeld/MethodNotes';
import ScenarioTable from './elterngeld/ScenarioTable';
import TradeoffChart from './elterngeld/TradeoffChart';
import { eur, eur2, eurSigned, parseAmount } from './elterngeld/format';

/**
 * Everything is computed in the browser. No profit, income or tax figure is ever
 * sent to a server — there is deliberately no API call in this tool.
 */

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--fg-secondary)',
  marginBottom: '0.375rem',
};

const hintStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 400,
  color: 'var(--muted)',
};

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <label htmlFor={id} style={labelStyle}>
        {label}
        {hint && (
          <>
            {' '}
            <span style={hintStyle}>{hint}</span>
          </>
        )}
      </label>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={labelStyle}>{legend}</legend>
      <div
        style={{
          display: 'flex',
          gap: '0.375rem',
          background: 'var(--bg)',
          padding: '0.25rem',
          borderRadius: '0.625rem',
          border: '1px solid var(--card-border)',
        }}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`op-btn ${value === option.value ? 'active' : ''}`}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            style={{ flex: 1, padding: '0.5rem 0.375rem', fontSize: '0.8125rem' }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** The figures from a real Kindertagespflege EÜR, used by the example button. */
const EXAMPLE = {
  profitLow: '13421.69',
  profitHigh: '24470.36',
  employmentGross: '0',
  relief: '0',
};

export const ElterngeldOptimizer: React.FC = () => {
  const [filing, setFiling] = useState<FilingStatus>('single');
  const [profitDeltaKind, setProfitDeltaKind] = useState<ProfitDeltaKind>('timing');
  const [churchTaxPercent, setChurchTaxPercent] = useState<ChurchTaxPercent>(0);
  const [baseYear, setBaseYear] = useState<TaxYear>(2026);
  const [leaveYear, setLeaveYear] = useState<TaxYear>(2026);

  const [profitLow, setProfitLow] = useState(EXAMPLE.profitLow);
  const [profitHigh, setProfitHigh] = useState(EXAMPLE.profitHigh);
  const [employmentGross, setEmploymentGross] = useState(EXAMPLE.employmentGross);
  const [relief, setRelief] = useState(EXAMPLE.relief);

  const [partnerBase, setPartnerBase] = useState('0');
  const [partnerLeave, setPartnerLeave] = useState('0');
  const [ownLeave, setOwnLeave] = useState('0');

  const [pflichtKV, setPflichtKV] = useState(false);
  const [pflichtRV, setPflichtRV] = useState(true);
  const [pflichtAV, setPflichtAV] = useState(false);
  const [childless, setChildless] = useState(false);

  const [basisMonths, setBasisMonths] = useState('12');
  const [plusMonths, setPlusMonths] = useState('0');
  const [duringLeave, setDuringLeave] = useState('0');
  const [multiples, setMultiples] = useState('0');
  const [siblingBonus, setSiblingBonus] = useState(false);

  const loadExample = () => {
    setProfitLow(EXAMPLE.profitLow);
    setProfitHigh(EXAMPLE.profitHigh);
    setEmploymentGross(EXAMPLE.employmentGross);
    setRelief(EXAMPLE.relief);
    setFiling('single');
    setProfitDeltaKind('timing');
    setPflichtKV(false);
    setPflichtRV(true);
    setPflichtAV(false);
    setBasisMonths('12');
    setPlusMonths('0');
  };

  const model = useMemo(() => {
    const a = parseAmount(profitLow);
    const b = parseAmount(profitHigh);

    if (a < 0 || b < 0) {
      return { error: 'Declared profit cannot be negative.' as const };
    }
    if (Math.abs(a - b) < 0.01) {
      return { error: 'Enter two different profit figures to compare.' as const };
    }

    const profile: ElterngeldProfile = {
      baseYear,
      annualProfit: a,
      annualEmploymentGross: Math.max(0, parseAmount(employmentGross)),
      insurance: { pflichtKV, pflichtRV, pflichtAV, childless },
      churchTaxPercent,
      monthlyNetIncomeDuringLeave: Math.max(0, parseAmount(duringLeave)),
      siblingBonus,
      multipleBirthExtraChildren: Math.max(0, parseAmount(multiples)),
      basisMonths: Math.max(0, parseAmount(basisMonths)),
      plusMonths: Math.max(0, parseAmount(plusMonths)),
    };

    const household: HouseholdProfile = {
      filing,
      profitDeltaKind,
      churchTaxPercent,
      leaveYear,
      partnerIncomeBaseYear: Math.max(0, parseAmount(partnerBase)),
      partnerIncomeLeaveYear: Math.max(0, parseAmount(partnerLeave)),
      applicantIncomeLeaveYear: Math.max(0, parseAmount(ownLeave)),
      deductionsBaseYear: 0,
      deductionsLeaveYear: 0,
      futureReliefRate: Math.min(1, Math.max(0, parseAmount(relief) / 100)),
    };

    const lowProfit = Math.min(a, b);
    const highProfit = Math.max(a, b);
    const comparison = compareScenarios(
      [
        { label: 'Lower profit', annualProfit: lowProfit },
        { label: 'Higher profit', annualProfit: highProfit },
      ],
      profile,
      household,
    );

    const [low, high] = comparison.scenarios;
    const sweepFrom = Math.max(0, lowProfit * 0.7);
    const sweepTo = highProfit * 1.3;
    const points = sweepProfit(profile, household, sweepFrom, sweepTo, 90);

    return {
      error: null,
      low,
      high,
      household,
      points,
      optimum: findOptimum(points),
      lowProfit,
      highProfit,
      delta: high.netPosition - low.netPosition,
      basisMonths: profile.basisMonths,
    };
  }, [
    profitLow,
    profitHigh,
    employmentGross,
    relief,
    baseYear,
    leaveYear,
    filing,
    profitDeltaKind,
    churchTaxPercent,
    partnerBase,
    partnerLeave,
    ownLeave,
    pflichtKV,
    pflichtRV,
    pflichtAV,
    childless,
    basisMonths,
    plusMonths,
    duringLeave,
    multiples,
    siblingBonus,
  ]);

  const warnings: string[] = [];
  if (!model.error) {
    if (model.low.exceedsIncomeLimit || model.high.exceedsIncomeLimit) {
      warnings.push(
        `A taxable household income above ${eur(INCOME_LIMIT_ZVE)} removes the Elterngeld claim entirely (§ 1 Abs. 8 BEEG).`,
      );
    }
    if (Math.max(model.low.netto.monthlyNetto, model.high.netto.monthlyNetto) > BEMESSUNG_CAP) {
      warnings.push(
        `Elterngeld-Netto above ${eur(BEMESSUNG_CAP)} is ignored (§ 2 Abs. 1 Satz 3 BEEG), so profit beyond that point buys no extra Elterngeld.`,
      );
    }
    if (profitDeltaKind === 'timing' && parseAmount(relief) === 0) {
      warnings.push(
        'Postponed write-offs are valued at zero. They are not lost — they lower a later year’s tax. Set a later-relief rate to count them.',
      );
    }
  }

  const verdictTone = model.error
    ? 'neutral'
    : Math.abs(model.delta) < 50
      ? 'neutral'
      : model.delta > 0
        ? 'positive'
        : 'negative';

  const verdictBackground =
    verdictTone === 'positive'
      ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
      : verdictTone === 'negative'
        ? 'linear-gradient(135deg, #dc2626 0%, #f87171 100%)'
        : 'linear-gradient(135deg, #475569 0%, #64748b 100%)';

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* ── Inputs ── */}
        <div className="space-y-6 xl:col-span-1">
          <CardSection title="Household" gradient="from-amber-400 to-orange-500" delay="100ms">
            <Segmented
              legend="Assessment (Veranlagung)"
              value={filing}
              onChange={setFiling}
              options={[
                { value: 'single', label: 'Single' },
                { value: 'married', label: 'Married (Splitting)' },
              ]}
            />
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Field id="eg-church" label="Church tax">
                <select
                  id="eg-church"
                  className="form-input h-12"
                  value={churchTaxPercent}
                  onChange={(e) => setChurchTaxPercent(Number(e.target.value) as ChurchTaxPercent)}
                >
                  <option value={0}>None</option>
                  <option value={8}>8 % (BY/BW)</option>
                  <option value={9}>9 %</option>
                </select>
              </Field>
              <Field id="eg-base-year" label="Assessment year" hint="Bemessungszeitraum">
                <select
                  id="eg-base-year"
                  className="form-input h-12"
                  value={baseYear}
                  onChange={(e) => setBaseYear(Number(e.target.value) as TaxYear)}
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="eg-partner-base" label="Partner income" hint="assessment yr">
                <NumberInput id="eg-partner-base" value={partnerBase} onChange={setPartnerBase} step={500} min={0} unit="€" />
              </Field>
              <Field id="eg-partner-leave" label="Partner income" hint="leave yr">
                <NumberInput id="eg-partner-leave" value={partnerLeave} onChange={setPartnerLeave} step={500} min={0} unit="€" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="eg-own-leave" label="Your other income" hint="leave yr">
                <NumberInput id="eg-own-leave" value={ownLeave} onChange={setOwnLeave} step={500} min={0} unit="€" />
              </Field>
              <Field id="eg-leave-year" label="Leave year">
                <select
                  id="eg-leave-year"
                  className="form-input h-12"
                  value={leaveYear}
                  onChange={(e) => setLeaveYear(Number(e.target.value) as TaxYear)}
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
              </Field>
            </div>
          </CardSection>

          <CardSection title="The two options" gradient="from-orange-400 to-rose-500" delay="150ms">
            <Segmented
              legend="What creates the profit difference?"
              value={profitDeltaKind}
              onChange={setProfitDeltaKind}
              options={[
                { value: 'timing', label: 'Write-off timing' },
                { value: 'cash', label: 'Real extra earnings' },
              ]}
            />
            <p className="text-sm mt-2 mb-4" style={{ color: 'var(--muted)' }}>
              {profitDeltaKind === 'timing'
                ? 'Depreciation is non-cash: the same money is in your account either way, only the taxable profit moves — and the write-off returns in a later year.'
                : 'The extra profit is real money you actually earned on top.'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field id="eg-profit-low" label="Lower profit" hint="€/yr">
                <NumberInput id="eg-profit-low" value={profitLow} onChange={setProfitLow} step={100} min={0} unit="€" />
              </Field>
              <Field id="eg-profit-high" label="Higher profit" hint="€/yr">
                <NumberInput id="eg-profit-high" value={profitHigh} onChange={setProfitHigh} step={100} min={0} unit="€" />
              </Field>
            </div>
            <Field id="eg-emp-gross" label="Employment gross" hint="Bruttoarbeitslohn, § 2c BEEG">
              <NumberInput id="eg-emp-gross" value={employmentGross} onChange={setEmploymentGross} step={500} min={0} unit="€" />
            </Field>
            <Field id="eg-relief" label="Later relief on postponed write-offs" hint="marginal rate when the deduction lands">
              <NumberInput id="eg-relief" value={relief} onChange={setRelief} step={1} min={0} unit="%" />
            </Field>
            <button type="button" className="btn-ghost w-full h-11 text-sm font-semibold" onClick={loadExample}>
              Load Kindertagespflege example
            </button>
          </CardSection>

          <CardSection title="Insurance & leave" gradient="from-rose-400 to-fuchsia-500" delay="200ms">
            <fieldset style={{ border: 0, padding: 0, margin: '0 0 0.875rem' }}>
              <legend style={labelStyle}>
                Compulsory insurance <span style={hintStyle}>§ 2f BEEG flat deductions</span>
              </legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <ModernCheckbox id="eg-kv" checked={pflichtKV} onChange={setPflichtKV} label={<span className="text-sm">Health 9 %</span>} ariaLabel="Compulsory health insurance" />
                <ModernCheckbox id="eg-rv" checked={pflichtRV} onChange={setPflichtRV} label={<span className="text-sm">Pension 10 %</span>} ariaLabel="Compulsory pension insurance" />
                <ModernCheckbox id="eg-av" checked={pflichtAV} onChange={setPflichtAV} label={<span className="text-sm">Unemployment 2 %</span>} ariaLabel="Compulsory unemployment insurance" />
                <ModernCheckbox id="eg-childless" checked={childless} onChange={setChildless} label={<span className="text-sm">Childless</span>} ariaLabel="Childless surcharge on long-term care insurance" />
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Field id="eg-basis-months" label="Basiselterngeld" hint="months">
                <NumberInput id="eg-basis-months" value={basisMonths} onChange={setBasisMonths} step={1} min={0} unit="mo" />
              </Field>
              <Field id="eg-plus-months" label="ElterngeldPlus" hint="months">
                <NumberInput id="eg-plus-months" value={plusMonths} onChange={setPlusMonths} step={1} min={0} unit="mo" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="eg-during" label="Net income during leave" hint="€/month">
                <NumberInput id="eg-during" value={duringLeave} onChange={setDuringLeave} step={50} min={0} unit="€" />
              </Field>
              <Field id="eg-multiples" label="Extra children" hint="multiple birth">
                <NumberInput id="eg-multiples" value={multiples} onChange={setMultiples} step={1} min={0} />
              </Field>
            </div>
            <ModernCheckbox
              id="eg-sibling"
              checked={siblingBonus}
              onChange={setSiblingBonus}
              label={<span className="text-sm">Geschwisterbonus applies</span>}
              ariaLabel="Sibling bonus applies"
            />
          </CardSection>
        </div>

        {/* ── Results ── */}
        <div className="space-y-6 xl:col-span-2">
          {model.error && <ErrorAlert error={model.error} />}

          {!model.error && (
            <>
              <div
                className="rounded-2xl animate-scale-in"
                style={{ background: verdictBackground, color: '#fff', padding: '1.5rem', boxShadow: 'var(--shadow-soft)' }}
                role="status"
                aria-live="polite"
              >
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9 }}>
                  Recommendation
                </div>
                <div style={{ fontSize: 'clamp(1.875rem, 5vw, 3rem)', fontWeight: 800, lineHeight: 1.05, margin: '0.5rem 0' }}>
                  {eurSigned(model.delta)}
                </div>
                <p style={{ fontSize: '0.9375rem', opacity: 0.95, maxWidth: '62ch', margin: 0 }}>
                  {verdictTone === 'neutral' ? (
                    <>Both routes land within €50 of each other — the choice is essentially a wash. Pick the simpler filing.</>
                  ) : verdictTone === 'positive' ? (
                    <>
                      Declaring the <strong>higher</strong> profit of {eur2(model.highProfit)} leaves you better off. You pay{' '}
                      {eur2(model.high.baseYearTax.total - model.low.baseYearTax.total)} more income tax and gain{' '}
                      {eur2(model.high.amount.total - model.low.amount.total)} more Elterngeld.
                    </>
                  ) : (
                    <>
                      Keeping the <strong>lower</strong> profit of {eur2(model.lowProfit)} wins. The extra{' '}
                      {eur2(model.high.baseYearTax.total - model.low.baseYearTax.total)} of income tax outweighs the{' '}
                      {eur2(Math.abs(model.high.amount.total - model.low.amount.total))} difference in Elterngeld.
                    </>
                  )}
                </p>
              </div>

              <CardSection title="Side by side" gradient="from-amber-400 to-orange-500" delay="100ms">
                <ScenarioTable low={model.low} high={model.high} />
                {warnings.length > 0 && (
                  <ul className="mt-4 space-y-2 list-none p-0">
                    {warnings.map((warning) => (
                      <li
                        key={warning}
                        className="text-sm"
                        style={{
                          borderLeft: '3px solid var(--warning)',
                          background: 'rgba(245,158,11,0.09)',
                          borderRadius: '0.375rem',
                          padding: '0.5rem 0.75rem',
                          color: 'var(--fg-secondary)',
                        }}
                      >
                        {warning}
                      </li>
                    ))}
                  </ul>
                )}
              </CardSection>

              <CardSection title="Where the optimum sits" gradient="from-orange-400 to-rose-500" delay="150ms">
                <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
                  Net position across both years for every declared profit between the two options, extended 30 % either
                  side.
                </p>
                <TradeoffChart
                  points={model.points}
                  optimum={model.optimum}
                  lowProfit={model.lowProfit}
                  highProfit={model.highProfit}
                />
              </CardSection>

              <CardSection title="The reasoning & the equations" gradient="from-rose-400 to-fuchsia-500" delay="200ms">
                <MethodNotes
                  low={model.low}
                  high={model.high}
                  household={model.household}
                  basisMonths={model.basisMonths}
                />
                <div
                  className="text-sm mt-4"
                  style={{
                    borderLeft: '3px solid var(--warning)',
                    background: 'rgba(245,158,11,0.09)',
                    borderRadius: '0.375rem',
                    padding: '0.625rem 0.875rem',
                    color: 'var(--fg-secondary)',
                  }}
                >
                  <strong>Not tax advice.</strong> The § 2e step reproduces the Lohnsteuer procedure the Elterngeldstelle
                  applies, but the binding figure is the one in your Elterngeldbescheid, and depreciation elections are
                  only open in the year of acquisition. Everything is calculated in your browser — no figure entered here
                  is sent anywhere.
                </div>
              </CardSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElterngeldOptimizer;
