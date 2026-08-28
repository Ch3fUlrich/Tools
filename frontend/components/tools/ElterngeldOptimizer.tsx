"use client";

import React, { useMemo, useState } from 'react';
import CardSection from '@/components/ui/CardSection';
import ErrorAlert from '@/components/ui/ErrorAlert';
import ModernCheckbox from '@/components/ui/ModernCheckbox';
import NumberInput from '@/components/ui/NumberInput';
import { useTranslation } from '@/components/i18n/LanguageProvider';
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
import type { FilingStatus, TaxYear } from '@/lib/local/germanTax';
import FilingAdvice from './elterngeld/FilingAdvice';
import MethodNotes from './elterngeld/MethodNotes';
import ScenarioTable from './elterngeld/ScenarioTable';
import Sources from './elterngeld/Sources';
import TradeoffChart from './elterngeld/TradeoffChart';
import { eur, eur2, eurSigned, parseAmount } from './elterngeld/format';
import SavedScenarios from './elterngeld/SavedScenarios';
import type { ElterngeldSnapshot } from './elterngeld/scenarioState';

/**
 * Every figure is computed in the browser: no profit, income or tax number is sent anywhere
 * to produce a result, and there is deliberately no API call on the calculation path.
 *
 * The one exception is explicit and user-driven — pressing "Save inputs" stores the form
 * fields (never a computed result) against the signed-in account, so they can be reloaded
 * later. See {@link SavedScenarios}.
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

/**
 * A real Kindertagespflege case, shown as greyed-out placeholders so the page
 * demonstrates a full worked example on first load. Empty fields fall back to these
 * values, so the numbers on screen always match what is being calculated; typing in a
 * field replaces the example for that field only.
 */
const EXAMPLE = {
  profitLow: '13421.69',
  profitHigh: '24470.36',
  employmentGross: '0',
  relief: '0',
  partnerBase: '50000',
  partnerLeave: '50000',
  prepaidBase: '6500',
  prepaidLeave: '6500',
  ownLeave: '0',
  children: '2',
  extraContribution: '540',
  basisMonths: '12',
  plusMonths: '0',
  duringLeave: '0',
  multiples: '0',
  weeksBefore: '6',
  weeksAfter: '8',
};

/** An untouched field is worth its example, so the displayed numbers are the real inputs. */
const valueOr = (value: string, example: string) => (value.trim() === '' ? example : value);

export const ElterngeldOptimizer: React.FC = () => {
  const { t } = useTranslation();
  const [filing, setFiling] = useState<FilingStatus>('married');
  const [profitDeltaKind, setProfitDeltaKind] = useState<ProfitDeltaKind>('timing');
  const [baseYear, setBaseYear] = useState<TaxYear>(2026);
  const [leaveYear, setLeaveYear] = useState<TaxYear>(2026);

  const [profitLow, setProfitLow] = useState('');
  const [profitHigh, setProfitHigh] = useState('');
  const [employmentGross, setEmploymentGross] = useState('');
  const [relief, setRelief] = useState('');

  const [prepaidBase, setPrepaidBase] = useState('');
  const [prepaidLeave, setPrepaidLeave] = useState('');

  const [partnerBase, setPartnerBase] = useState('');
  const [partnerLeave, setPartnerLeave] = useState('');
  const [ownLeave, setOwnLeave] = useState('');

  const [pflichtKV, setPflichtKV] = useState(false);
  const [pflichtRV, setPflichtRV] = useState(true);
  const [pflichtAV, setPflichtAV] = useState(false);
  const [childless, setChildless] = useState(false);

  const [children, setChildren] = useState('');
  const [maternityEnabled, setMaternityEnabled] = useState(false);
  const [weeksBefore, setWeeksBefore] = useState('');
  const [weeksAfter, setWeeksAfter] = useState('');
  const [extraContribution, setExtraContribution] = useState('');

  const [basisMonths, setBasisMonths] = useState('');
  const [plusMonths, setPlusMonths] = useState('');
  const [duringLeave, setDuringLeave] = useState('');
  const [multiples, setMultiples] = useState('');
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

  /** The form as it stands, in the shape {@link SavedScenarios} persists. */
  const snapshot: ElterngeldSnapshot = {
    filing,
    profitDeltaKind,
    baseYear,
    leaveYear,
    profitLow,
    profitHigh,
    employmentGross,
    relief,
    prepaidBase,
    prepaidLeave,
    partnerBase,
    partnerLeave,
    ownLeave,
    pflichtKV,
    pflichtRV,
    pflichtAV,
    childless,
    children,
    maternityEnabled,
    weeksBefore,
    weeksAfter,
    extraContribution,
    basisMonths,
    plusMonths,
    duringLeave,
    multiples,
    siblingBonus,
  };

  /**
   * Apply a loaded scenario. Only the fields the payload actually carried are set — an
   * older save that predates a field leaves that field at its current value rather than
   * blanking it.
   */
  const applySnapshot = (fields: Partial<ElterngeldSnapshot>) => {
    if (fields.filing !== undefined) setFiling(fields.filing);
    if (fields.profitDeltaKind !== undefined) setProfitDeltaKind(fields.profitDeltaKind);
    if (fields.baseYear !== undefined) setBaseYear(fields.baseYear);
    if (fields.leaveYear !== undefined) setLeaveYear(fields.leaveYear);
    if (fields.profitLow !== undefined) setProfitLow(fields.profitLow);
    if (fields.profitHigh !== undefined) setProfitHigh(fields.profitHigh);
    if (fields.employmentGross !== undefined) setEmploymentGross(fields.employmentGross);
    if (fields.relief !== undefined) setRelief(fields.relief);
    if (fields.prepaidBase !== undefined) setPrepaidBase(fields.prepaidBase);
    if (fields.prepaidLeave !== undefined) setPrepaidLeave(fields.prepaidLeave);
    if (fields.partnerBase !== undefined) setPartnerBase(fields.partnerBase);
    if (fields.partnerLeave !== undefined) setPartnerLeave(fields.partnerLeave);
    if (fields.ownLeave !== undefined) setOwnLeave(fields.ownLeave);
    if (fields.pflichtKV !== undefined) setPflichtKV(fields.pflichtKV);
    if (fields.pflichtRV !== undefined) setPflichtRV(fields.pflichtRV);
    if (fields.pflichtAV !== undefined) setPflichtAV(fields.pflichtAV);
    if (fields.childless !== undefined) setChildless(fields.childless);
    if (fields.children !== undefined) setChildren(fields.children);
    if (fields.maternityEnabled !== undefined) setMaternityEnabled(fields.maternityEnabled);
    if (fields.weeksBefore !== undefined) setWeeksBefore(fields.weeksBefore);
    if (fields.weeksAfter !== undefined) setWeeksAfter(fields.weeksAfter);
    if (fields.extraContribution !== undefined) setExtraContribution(fields.extraContribution);
    if (fields.basisMonths !== undefined) setBasisMonths(fields.basisMonths);
    if (fields.plusMonths !== undefined) setPlusMonths(fields.plusMonths);
    if (fields.duringLeave !== undefined) setDuringLeave(fields.duringLeave);
    if (fields.multiples !== undefined) setMultiples(fields.multiples);
    if (fields.siblingBonus !== undefined) setSiblingBonus(fields.siblingBonus);
  };

  const model = useMemo(() => {
    const a = parseAmount(valueOr(profitLow, EXAMPLE.profitLow));
    const b = parseAmount(valueOr(profitHigh, EXAMPLE.profitHigh));

    if (a < 0 || b < 0) {
      return { ok: false as const, error: t('eg.errNegative') };
    }
    if (Math.abs(a - b) < 0.01) {
      return { ok: false as const, error: t('eg.errIdentical') };
    }

    const profile: ElterngeldProfile = {
      baseYear,
      annualProfit: a,
      annualEmploymentGross: Math.max(0, parseAmount(valueOr(employmentGross, EXAMPLE.employmentGross))),
      insurance: { pflichtKV, pflichtRV, pflichtAV, childless },
      monthlyNetIncomeDuringLeave: Math.max(0, parseAmount(valueOr(duringLeave, EXAMPLE.duringLeave))),
      siblingBonus,
      multipleBirthExtraChildren: Math.max(0, parseAmount(valueOr(multiples, EXAMPLE.multiples))),
      basisMonths: Math.max(0, parseAmount(valueOr(basisMonths, EXAMPLE.basisMonths))),
      plusMonths: Math.max(0, parseAmount(valueOr(plusMonths, EXAMPLE.plusMonths))),
    };

    const household: HouseholdProfile = {
      filing,
      profitDeltaKind,
      leaveYear,
      partnerIncomeBaseYear: Math.max(0, parseAmount(valueOr(partnerBase, EXAMPLE.partnerBase))),
      partnerIncomeLeaveYear: Math.max(0, parseAmount(valueOr(partnerLeave, EXAMPLE.partnerLeave))),
      applicantIncomeLeaveYear: Math.max(0, parseAmount(valueOr(ownLeave, EXAMPLE.ownLeave))),
      deductionsBaseYear: 0,
      deductionsLeaveYear: 0,
      taxPrepaidBaseYear: Math.max(0, parseAmount(valueOr(prepaidBase, EXAMPLE.prepaidBase))),
      taxPrepaidLeaveYear: Math.max(0, parseAmount(valueOr(prepaidLeave, EXAMPLE.prepaidLeave))),
      futureReliefRate: Math.min(1, Math.max(0, parseAmount(valueOr(relief, EXAMPLE.relief)) / 100)),
      children: Math.max(0, parseAmount(valueOr(children, EXAMPLE.children))),
      maternity: {
        enabled: maternityEnabled,
        weeksBefore: Math.max(0, parseAmount(valueOr(weeksBefore, EXAMPLE.weeksBefore))),
        weeksAfter: Math.max(0, parseAmount(valueOr(weeksAfter, EXAMPLE.weeksAfter))),
        extraContributionTotal: Math.max(0, parseAmount(valueOr(extraContribution, EXAMPLE.extraContribution))),
      },
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
      ok: true as const,
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
    partnerBase,
    partnerLeave,
    prepaidBase,
    prepaidLeave,
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
    children,
    maternityEnabled,
    weeksBefore,
    weeksAfter,
    extraContribution,
    t,
  ]);

  const warnings: string[] = [];
  if (model.ok) {
    if (model.low.exceedsIncomeLimit || model.high.exceedsIncomeLimit) {
      warnings.push(
        t('eg.warnIncomeLimit', { limit: eur(INCOME_LIMIT_ZVE) }),
      );
    }
    if (Math.max(model.low.netto.monthlyNetto, model.high.netto.monthlyNetto) > BEMESSUNG_CAP) {
      warnings.push(
        t('eg.warnCap', { cap: eur(BEMESSUNG_CAP) }),
      );
    }
    if (profitDeltaKind === 'timing' && parseAmount(valueOr(relief, EXAMPLE.relief)) === 0) {
      warnings.push(
        t('eg.warnRelief'),
      );
    }
  }

  const verdictTone = !model.ok
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
          <CardSection title={t('eg.household')} gradient="from-amber-400 to-orange-500" delay="100ms">
            <Segmented
              legend={t('eg.filingLegend')}
              value={filing}
              onChange={setFiling}
              options={[
                { value: 'single', label: t('eg.single') },
                { value: 'married', label: t('eg.married') },
              ]}
            />
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Field id="eg-base-year" label={t('eg.baseYear')} hint={t('eg.baseYearHint')}>
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
              <Field id="eg-partner-base" label={t('eg.partnerIncome')} hint={t('eg.assessmentYr')}>
                <NumberInput id="eg-partner-base" value={partnerBase} onChange={setPartnerBase} step={500} min={0} unit="€" placeholder={EXAMPLE.partnerBase} />
              </Field>
              <Field id="eg-partner-leave" label={t('eg.partnerIncome')} hint={t('eg.leaveYr')}>
                <NumberInput id="eg-partner-leave" value={partnerLeave} onChange={setPartnerLeave} step={500} min={0} unit="€" placeholder={EXAMPLE.partnerLeave} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="eg-prepaid-base" label={t('eg.prepaidBase')} hint={t('eg.prepaidBaseHint')}>
                <NumberInput id="eg-prepaid-base" value={prepaidBase} onChange={setPrepaidBase} step={500} min={0} unit="€" placeholder={EXAMPLE.prepaidBase} />
              </Field>
              <Field id="eg-prepaid-leave" label={t('eg.prepaidLeave')} hint={t('eg.prepaidLeaveHint')}>
                <NumberInput id="eg-prepaid-leave" value={prepaidLeave} onChange={setPrepaidLeave} step={500} min={0} unit="€" placeholder={EXAMPLE.prepaidLeave} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="eg-own-leave" label={t('eg.ownIncome')} hint={t('eg.leaveYr')}>
                <NumberInput id="eg-own-leave" value={ownLeave} onChange={setOwnLeave} step={500} min={0} unit="€" placeholder={EXAMPLE.ownLeave} />
              </Field>
              <Field id="eg-leave-year" label={t('eg.leaveYear')}>
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

          <CardSection title={t('eg.options')} gradient="from-orange-400 to-rose-500" delay="150ms">
            <Segmented
              legend={t('eg.deltaLegend')}
              value={profitDeltaKind}
              onChange={setProfitDeltaKind}
              options={[
                { value: 'timing', label: t('eg.timing') },
                { value: 'cash', label: t('eg.cash') },
              ]}
            />
            <p className="text-sm mt-2 mb-4" style={{ color: 'var(--muted)' }}>
              {profitDeltaKind === 'timing'
                ? t('eg.timingHint')
                : t('eg.cashHint')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field id="eg-profit-low" label={t('eg.lowerProfit')} hint={t('eg.perYear')}>
                <NumberInput id="eg-profit-low" value={profitLow} onChange={setProfitLow} step={100} min={0} unit="€" placeholder={EXAMPLE.profitLow} />
              </Field>
              <Field id="eg-profit-high" label={t('eg.higherProfit')} hint={t('eg.perYear')}>
                <NumberInput id="eg-profit-high" value={profitHigh} onChange={setProfitHigh} step={100} min={0} unit="€" placeholder={EXAMPLE.profitHigh} />
              </Field>
            </div>
            <Field id="eg-emp-gross" label={t('eg.employmentGross')} hint={t('eg.employmentGrossHint')}>
              <NumberInput id="eg-emp-gross" value={employmentGross} onChange={setEmploymentGross} step={500} min={0} unit="€" placeholder={EXAMPLE.employmentGross} />
            </Field>
            <Field id="eg-relief" label={t('eg.relief')} hint={t('eg.reliefHint')}>
              <NumberInput id="eg-relief" value={relief} onChange={setRelief} step={1} min={0} unit="%" placeholder={EXAMPLE.relief} />
            </Field>
            <button type="button" className="btn-ghost w-full h-11 text-sm font-semibold" onClick={loadExample}>
              {t('eg.loadExample')}
            </button>
          </CardSection>

          <CardSection title={t('eg.insurance')} gradient="from-rose-400 to-fuchsia-500" delay="200ms">
            <fieldset style={{ border: 0, padding: 0, margin: '0 0 0.875rem' }}>
              <legend style={labelStyle}>
                {t('eg.insuranceLegend')} <span style={hintStyle}>{t('eg.insuranceLegendHint')}</span>
              </legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <ModernCheckbox id="eg-kv" checked={pflichtKV} onChange={setPflichtKV} label={<span className="text-sm">{t('eg.health')}</span>} ariaLabel={t('eg.healthAria')} />
                <ModernCheckbox id="eg-rv" checked={pflichtRV} onChange={setPflichtRV} label={<span className="text-sm">{t('eg.pension')}</span>} ariaLabel={t('eg.pensionAria')} />
                <ModernCheckbox id="eg-av" checked={pflichtAV} onChange={setPflichtAV} label={<span className="text-sm">{t('eg.unemployment')}</span>} ariaLabel={t('eg.unemploymentAria')} />
                <ModernCheckbox id="eg-childless" checked={childless} onChange={setChildless} label={<span className="text-sm">{t('eg.childless')}</span>} ariaLabel={t('eg.childlessAria')} />
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Field id="eg-basis-months" label={t('eg.basisMonths')} hint={t('eg.months')}>
                <NumberInput id="eg-basis-months" value={basisMonths} onChange={setBasisMonths} step={1} min={0} unit="mo" placeholder={EXAMPLE.basisMonths} />
              </Field>
              <Field id="eg-plus-months" label={t('eg.plusMonths')} hint={t('eg.months')}>
                <NumberInput id="eg-plus-months" value={plusMonths} onChange={setPlusMonths} step={1} min={0} unit="mo" placeholder={EXAMPLE.plusMonths} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="eg-during" label={t('eg.duringLeave')} hint={t('eg.perMonth')}>
                <NumberInput id="eg-during" value={duringLeave} onChange={setDuringLeave} step={50} min={0} unit="€" placeholder={EXAMPLE.duringLeave} />
              </Field>
              <Field id="eg-multiples" label={t('eg.multiples')} hint={t('eg.multiplesHint')}>
                <NumberInput id="eg-multiples" value={multiples} onChange={setMultiples} step={1} min={0} placeholder={EXAMPLE.multiples} />
              </Field>
            </div>
            <ModernCheckbox
              id="eg-sibling"
              checked={siblingBonus}
              onChange={setSiblingBonus}
              label={<span className="text-sm">{t('eg.siblingBonus')}</span>}
              ariaLabel={t('eg.siblingBonusAria')}
            />
          </CardSection>

          <CardSection title={t('eg.childrenSection')} gradient="from-fuchsia-500 to-violet-600" delay="250ms">
            <Field id="eg-children" label={t('eg.children')} hint={t('eg.childrenHint')}>
              <NumberInput id="eg-children" value={children} onChange={setChildren} step={1} min={0} placeholder={EXAMPLE.children} />
            </Field>
            <ModernCheckbox
              id="eg-maternity"
              checked={maternityEnabled}
              onChange={setMaternityEnabled}
              label={<span className="text-sm">{t('eg.maternityElected')}</span>}
              ariaLabel={t('eg.maternityElectedAria')}
            />
            <p className="text-sm mt-2 mb-3" style={{ color: 'var(--muted)' }}>
              {t('eg.maternityHint')}
            </p>
            {maternityEnabled && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field id="eg-weeks-before" label={t('eg.weeksBefore')} hint={t('eg.weeksBeforeHint')}>
                    <NumberInput id="eg-weeks-before" value={weeksBefore} onChange={setWeeksBefore} step={1} min={0} unit="wk" placeholder={EXAMPLE.weeksBefore} />
                  </Field>
                  <Field id="eg-weeks-after" label={t('eg.weeksAfter')} hint={t('eg.weeksAfterHint')}>
                    <NumberInput id="eg-weeks-after" value={weeksAfter} onChange={setWeeksAfter} step={1} min={0} unit="wk" placeholder={EXAMPLE.weeksAfter} />
                  </Field>
                </div>
                <Field id="eg-extra-contribution" label={t('eg.extraContribution')} hint={t('eg.extraContributionHint')}>
                  <NumberInput id="eg-extra-contribution" value={extraContribution} onChange={setExtraContribution} step={10} min={0} unit="€" placeholder={EXAMPLE.extraContribution} />
                </Field>
              </>
            )}
          </CardSection>

          <CardSection
            title={t('eg.savedTitle')}
            gradient="from-violet-500 to-purple-600"
            delay="300ms"
          >
            <SavedScenarios snapshot={snapshot} onLoad={applySnapshot} />
          </CardSection>
        </div>

        {/* ── Results ── */}
        <div className="space-y-6 xl:col-span-2">
          {!model.ok && <ErrorAlert error={model.error} />}

          {model.ok && (
            <>
              <div
                className="rounded-2xl animate-scale-in"
                style={{ background: verdictBackground, color: '#fff', padding: '1.5rem', boxShadow: 'var(--shadow-soft)' }}
                role="status"
                aria-live="polite"
              >
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9 }}>
                  {t('eg.recommendation')}
                </div>
                <div style={{ fontSize: 'clamp(1.875rem, 5vw, 3rem)', fontWeight: 800, lineHeight: 1.05, margin: '0.5rem 0' }}>
                  {eurSigned(model.delta)}
                </div>
                <p style={{ fontSize: '0.9375rem', opacity: 0.95, maxWidth: '62ch', margin: 0 }}>
                  {verdictTone === 'neutral'
                    ? t('eg.verdictWash')
                    : t(verdictTone === 'positive' ? 'eg.verdictHigher' : 'eg.verdictLower', {
                        profit: eur2(verdictTone === 'positive' ? model.highProfit : model.lowProfit),
                        tax: eur2(model.high.baseYearTax.total - model.low.baseYearTax.total),
                        benefit: eur2(Math.abs(model.high.benefitsTotal - model.low.benefitsTotal)),
                      })}
                </p>
              </div>

              <CardSection title={t('eg.sideBySide')} gradient="from-amber-400 to-orange-500" delay="100ms">
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

              <CardSection title={t('eg.filingTitle')} gradient="from-fuchsia-500 to-violet-600" delay="120ms">
                <FilingAdvice
                  comparison={model.high.filingComparison}
                  benefitsTotal={model.high.benefitsTotal}
                />
              </CardSection>

              <CardSection title={t('eg.optimumTitle')} gradient="from-orange-400 to-rose-500" delay="150ms">
                <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
                  {t('eg.optimumIntro')}
                </p>
                <TradeoffChart
                  points={model.points}
                  optimum={model.optimum}
                  lowProfit={model.lowProfit}
                  highProfit={model.highProfit}
                />
              </CardSection>

              <CardSection title={t('eg.reasoningTitle')} gradient="from-rose-400 to-fuchsia-500" delay="200ms">
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
                  {t('eg.disclaimer')}
                </div>
              </CardSection>

              <CardSection title={t('eg.sourcesTitle')} gradient="from-slate-400 to-slate-600" delay="250ms">
                <Sources />
              </CardSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElterngeldOptimizer;
