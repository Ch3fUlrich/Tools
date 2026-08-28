"use client";

import React, { useState, useEffect } from 'react';
import NumberInput from '@/components/ui/NumberInput';
import ErrorAlert from '@/components/ui/ErrorAlert';
import CardSection from '@/components/ui/CardSection';
import { calculateTolerance, getToleranceSubstances, Substance, BloodLevelPoint } from '../../lib/api/client';
import LineChart from '../charts/LineChart';

interface SubstanceIntake {
  substance: string;
  time: string; // ISO string
  intakeType: string;
  timeAfterMeal: number | null;
  dosageMg: number;
}

/**
 * Opened cold, the tool used to show an empty row and an empty chart, which says nothing
 * about what it does. These two seed a realistic curve straight away: a coffee two hours
 * ago and an ibuprofen an hour ago. Caffeine's 5.7 h half-life against ibuprofen's 2 h
 * makes the point of the whole tool visible in one glance — the short-half-life drug is
 * already falling away while the stimulant is barely down.
 *
 * Only applied when the loaded substance list actually contains both, so a backend (or a
 * test) serving a different catalogue still starts blank.
 */
const EXAMPLE_INTAKES: { id: string; dosageMg: number; hoursAgo: number }[] = [
  { id: 'caffeine', dosageMg: 100, hoursAgo: 2 },
  { id: 'ibuprofen', dosageMg: 400, hoursAgo: 1 },
];

const BloodLevelCalculator: React.FC = () => {
  const [intakes, setIntakes] = useState<SubstanceIntake[]>([
    {
      substance: '',
      time: new Date().toISOString(),
      intakeType: 'oral',
      timeAfterMeal: null,
      dosageMg: 0,
    }
  ]);

  const [substances, setSubstances] = useState<Substance[]>([]);
  const [bloodLevels, setBloodLevels] = useState<BloodLevelPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSubstances = async () => {
      try {
        const subs = await getToleranceSubstances();
        setSubstances(subs);

        // Seed the worked example only when every substance it needs is available.
        const seeded: (SubstanceIntake | null)[] = EXAMPLE_INTAKES.map((example) => {
          const match = subs.find((s) => s.id === example.id);
          return match
            ? {
                substance: match.name,
                time: new Date(Date.now() - example.hoursAgo * 3_600_000).toISOString(),
                intakeType: 'oral',
                timeAfterMeal: null,
                dosageMg: example.dosageMg,
              }
            : null;
        });

        if (seeded.every((s): s is SubstanceIntake => s !== null)) {
          setIntakes(seeded);
          await calculateBloodLevels(seeded);
        }
      } catch (err) {
        /* eslint-disable-next-line no-console */
        console.error('Failed to load substances:', err);
      }
    };
    loadSubstances();
    // Runs once on mount; calculateBloodLevels is stable enough for this single call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Blood level points carry the substance id; show the display name when known.
  const substanceDisplayName = (idOrName: string) =>
    substances.find((s) => s.id === idOrName)?.name ?? idOrName;

  const addIntake = () => {
    setIntakes([...intakes, {
      substance: '',
      time: new Date().toISOString(),
      intakeType: 'oral',
      timeAfterMeal: null,
      dosageMg: 0,
    }]);
  };

  const removeIntake = (index: number) => {
    if (intakes.length > 1) {
      setIntakes(intakes.filter((_, i) => i !== index));
    }
  };

  const updateIntake = (index: number, updates: Partial<SubstanceIntake>) => {
    const newIntakes = [...intakes];
    newIntakes[index] = { ...newIntakes[index], ...updates };
    setIntakes(newIntakes);
  };

  const calculateBloodLevels = async (source?: SubstanceIntake[]) => {
    setLoading(true);
    setError(null);

    const validIntakes = (source ?? intakes).filter(
      (intake) => intake.substance && intake.substance.trim() !== '' && intake.dosageMg > 0,
    );
    // Guard against a silent empty result when nothing is filled in yet —
    // only when substances are loaded, so a failed substance fetch still
    // lets the request through (and surfaces its own error).
    if (validIntakes.length === 0 && substances.length > 0) {
      setError('Calculation failed — select a substance and enter a dosage greater than 0 for at least one intake.');
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      const timePoints = [];
      for (let i = 0; i <= 48; i++) {
        const timePoint = new Date(now.getTime() + i * 60 * 60 * 1000);
        timePoints.push(timePoint.toISOString());
      }

      const request = {
        intakes: validIntakes
          .map(intake => ({
            substance: intake.substance,
            time: intake.time,
            dosage_mg: intake.dosageMg,
          })),
        time_points: timePoints,
      };

      const response = await calculateTolerance(request);
      setBloodLevels(response.blood_levels);
    } catch (err) {
      /* eslint-disable-next-line no-console */
      console.error('Tolerance calc error:', err);
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bloodlevel-tool p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
      {/* Input Panel */}
      <CardSection title="Substance Intake" gradient="from-red-500 to-rose-600" delay="100ms">

        <div className="space-y-4">
          <div className="bloodlevel-intake-table">
            <table className="w-full text-sm rounded-lg" style={{ border: '1px solid var(--card-border)' }}>
              <thead>
                <tr style={{ background: 'var(--input-bg)' }}>
                  <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--muted)' }}>Substance</th>
                  <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--muted)' }}>Time</th>
                  <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--muted)' }}>Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--muted)' }}>Time After Meal</th>
                  <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--muted)' }}>Dosage (mg)</th>
                  <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {intakes.map((intake, index) => (
                  <tr key={index} style={{ borderTop: '1px solid var(--card-border)' }}>
                    <td className="px-3 py-2" data-label="Substance">
                      <select
                        aria-label={`Substance for intake ${index + 1}`}
                        value={intake.substance}
                        onChange={(e) => updateIntake(index, { substance: e.target.value })}
                        className="form-input text-sm"
                      >
                        <option value="">Select substance...</option>
                        {substances.map((sub) => (
                          // The backend matches intakes by substance name, so the
                          // name (not the id) is the wire value.
                          <option key={sub.id} value={sub.name}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2" data-label="Time">
                      <input
                        aria-label={`Time for intake ${index + 1}`}
                        type="datetime-local"
                        value={intake.time.slice(0, 16)}
                        onChange={(e) => updateIntake(index, { time: new Date(e.target.value).toISOString() })}
                        className="form-input text-sm"
                      />
                    </td>
                    <td className="px-3 py-2" data-label="Type">
                      <select
                        aria-label={`Intake type for intake ${index + 1}`}
                        value={intake.intakeType}
                        onChange={(e) => updateIntake(index, { intakeType: e.target.value })}
                        className="form-input text-sm"
                      >
                        <option value="oral">Oral</option>
                        <option value="intravenous">Intravenous</option>
                        <option value="inhaled">Inhaled</option>
                        <option value="topical">Topical</option>
                      </select>
                    </td>
                    <td className="px-3 py-2" data-label="After meal">
                      <NumberInput
                        id={`time-after-meal-${index}`}
                        value={intake.timeAfterMeal ? String(intake.timeAfterMeal) : ''}
                        onChange={(v) => updateIntake(index, { timeAfterMeal: v ? Number(v) : null })}
                        step={1}
                        min={0}
                        placeholder="minutes"
                        className="form-input--compact"
                      />
                    </td>
                    <td className="px-3 py-2" data-label="Dosage">
                      <NumberInput
                        id={`dosage-${index}`}
                        value={String(intake.dosageMg)}
                        onChange={(v) => updateIntake(index, { dosageMg: Number(v) })}
                        step={0.1}
                        min={0}
                        placeholder="mg"
                        className="form-input--compact"
                      />
                    </td>
                    <td className="px-3 py-2 bloodlevel-actions-cell" data-label="Actions">
                      {intakes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIntake(index)}
                          className="remove-btn"
                          aria-label={`Remove intake ${index}`}
                        >
                          <span aria-hidden>✖</span>
                          <span className="sr-only">Remove</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={addIntake}
            className="btn-success w-full text-sm"
          >
            + Add Intake
          </button>

          <button
            onClick={() => calculateBloodLevels()}
            disabled={loading}
            className="btn-primary w-full text-base mt-2 h-12 font-semibold shadow-soft-lg hover:shadow-soft-xl transition-all duration-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="spinner mr-3" />
                Calculating...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>🧮</span>
                Calculate Blood Levels
              </div>
            )}
          </button>

          {error && <ErrorAlert error={error} />}
        </div>
      </CardSection>

      {/* Results Panel */}
      <CardSection title="Blood Level Graph" gradient="from-blue-500 to-indigo-600" delay="200ms">

        {bloodLevels.length > 0 ? (
          <div className="space-y-6">
            {Array.from(new Set(bloodLevels.map(bl => bl.substance))).map(substance => {
              const substanceData = bloodLevels
                .filter(bl => bl.substance === substance)
                .map(bl => ({
                  time: bl.time,
                  value: bl.amount_mg,
                }));

              return (
                <div key={substance} className="space-y-3">
                  <h3 className="text-lg font-medium" style={{ color: 'var(--fg)' }}>
                    {substanceDisplayName(substance)} Blood Levels
                  </h3>
                  <LineChart
                    data={substanceData}
                    width={400}
                    height={200}
                    color="#3b82f6"
                    className="bloodlevel-chart"
                  />
                </div>
              );
            })}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {Array.from(new Set(bloodLevels.map(bl => bl.substance))).map(substance => {
                const substanceLevels = bloodLevels.filter(bl => bl.substance === substance);
                const maxLevel = Math.max(...substanceLevels.map(bl => bl.amount_mg));
                const currentLevel = substanceLevels[substanceLevels.length - 1]?.amount_mg || 0;

                return (
                  <div key={substance} className="rounded-xl p-4" style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.3)' }}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium" style={{ color: 'var(--fg)' }}>{substanceDisplayName(substance)}</span>
                      <span className="text-sm font-semibold" style={{ color: '#3b82f6' }}>
                        Now: {currentLevel.toFixed(2)} mg
                      </span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      Peak: {maxLevel.toFixed(2)} mg
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bloodlevel-empty-state rounded-xl p-12 flex items-center justify-center" style={{ background: 'var(--input-bg)' }}>
            <div className="text-center">
              <span className="text-5xl mb-4 block">📊</span>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Add substance intakes above and calculate to see blood level graphs
              </p>
            </div>
          </div>
        )}
      </CardSection>

      <CardSection title="How this is calculated" gradient="from-slate-400 to-slate-600" delay="300ms">
        <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
          Each intake decays independently and the curve is their sum. For one substance:
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
        >{`amount(t) = Σ  dose_i × F × 0.5 ^ ((t − t_i) / t½)
            i

  F   bioavailability — the fraction that reaches the bloodstream
  t½  elimination half-life: the time to clear half of what is present
  t_i time of intake i; terms with t < t_i contribute nothing`}</pre>
        <p className="text-sm" style={{ color: 'var(--muted)', margin: '0 0 0.5rem' }}>
          This is a one-compartment model with first-order elimination. It assumes a dose
          reaches the blood the moment it is taken, so it has no absorption phase and no
          Tmax: right after an oral dose the real curve is still rising while this one is
          already at its peak. Past roughly an hour the two agree closely, which is the part
          that matters for stacking doses and for judging when a substance has washed out.
        </p>
        <p className="text-sm" style={{ color: 'var(--muted)', margin: 0 }}>
          Half-lives are adult population averages, and individuals vary widely — caffeine
          alone ranges from about 2 to 10 hours depending on CYP1A2 activity, smoking,
          pregnancy and oral contraceptives. Ethanol is the one substance here that does not
          obey this equation at all: it is cleared at a near-constant rate rather than by a
          fixed half-life, so treat its curve as a rough shape only. Educational tool, not
          medical or dosing advice.
        </p>
      </CardSection>
    </div>
  );
};

export default BloodLevelCalculator;
