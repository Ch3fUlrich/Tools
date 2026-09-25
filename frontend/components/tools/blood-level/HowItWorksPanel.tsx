import React from 'react';
import CardSection from '@/components/ui/CardSection';

const HowItWorksPanel: React.FC = () => {
  return (
    <CardSection
      title="How this is calculated"
      gradient="from-slate-400 to-slate-600"
      delay="300ms"
    >
      <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
        Each intake decays independently and the curve is their sum. For one
        substance:
      </p>
      <pre
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '0.75rem',
          lineHeight: 1.6,
          background: 'var(--bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '0.5rem',
          padding: '0.75rem 0.875rem',
          margin: '0 0 0.875rem',
          overflowX: 'auto',
          color: 'var(--fg-secondary)',
          whiteSpace: 'pre',
        }}
      >{`amount(t) = Σ  F·D_i · ka/(ka − ke) · ( e^(−ke·(t−t_i)) − e^(−ka·(t−t_i)) )
          i

F   bioavailability for the route taken — how much reaches the bloodstream
ka  absorption rate, solved from that route's published Tmax
ke  elimination rate = ln2 / half-life
t_i time of intake i; terms with t < t_i contribute nothing`}</pre>
      <p
        className="text-sm"
        style={{ color: 'var(--muted)', margin: '0 0 0.5rem' }}
      >
        A one-compartment model with first-order absorption and elimination. The
        dose has to be absorbed before it can act, so the curve starts at zero,
        climbs to a peak at roughly the substance&rsquo;s Tmax, and only then
        decays — an intravenous dose is the exception, and skips straight to the
        peak because it is already in the blood.
      </p>
      <p
        className="text-sm"
        style={{ color: 'var(--muted)', margin: '0 0 0.5rem' }}
      >
        The <strong style={{ color: 'var(--fg)' }}>Type</strong> and{' '}
        <strong style={{ color: 'var(--fg)' }}>Time After Meal</strong> columns
        both feed into this. Route changes how much is absorbed and how fast —
        swallowed nicotine largely does not survive first-pass metabolism, while
        inhaled nicotine peaks within minutes. Food delays gastric emptying, so
        an intake logged within two hours of a meal absorbs more slowly:
        ibuprofen&rsquo;s peak arrives about twice as late and noticeably lower,
        though the total exposure is unchanged. For a few substances food
        genuinely reduces the total too, which is why omeprazole is taken before
        breakfast.
      </p>
      <p className="text-sm" style={{ color: 'var(--muted)', margin: 0 }}>
        Ethanol gets its own equation. It has no half-life: alcohol
        dehydrogenase saturates far below the concentration of a single drink,
        so it is cleared at a near-constant rate of roughly 8.5 g/h for a 70 kg
        adult. It is modelled as Michaelis-Menten (Vmax 8.5 g/h, Km ≈ 80 mg/L)
        and integrated numerically, because non-linear elimination means
        separate drinks do not simply add up. Everything else here is adult
        population averages and individuals vary widely — caffeine alone ranges
        from about 2 to 10 hours depending on CYP1A2 activity, smoking,
        pregnancy and oral contraceptives. Educational tool, not medical or
        dosing advice.
      </p>
    </CardSection>
  );
};

export default HowItWorksPanel;
