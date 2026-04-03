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
      } catch (err) {
        /* eslint-disable-next-line no-console */
        console.error('Failed to load substances:', err);
      }
    };
    loadSubstances();
  }, []);

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

  const calculateBloodLevels = async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const timePoints = [];
      for (let i = 0; i <= 48; i++) {
        const timePoint = new Date(now.getTime() + i * 60 * 60 * 1000);
        timePoints.push(timePoint.toISOString());
      }

      const request = {
        intakes: intakes
          .filter(intake => intake.substance && intake.substance.trim() !== '' && intake.dosageMg > 0)
          .map(intake => ({
            substance: intake.substance,
            time: intake.time,
            intake_type: intake.intakeType,
            time_after_meal: intake.timeAfterMeal,
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
    <div className="p-6 lg:p-8 space-y-8">
      {/* Input Panel */}
      <CardSection title="Substance Intake" gradient="from-red-500 to-rose-600" delay="100ms">

        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm rounded-lg min-w-[760px]" style={{ border: '1px solid var(--card-border)' }}>
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
                    <td className="px-3 py-2">
                      <select
                        value={intake.substance}
                        onChange={(e) => updateIntake(index, { substance: e.target.value })}
                        className="form-input text-sm"
                      >
                        <option value="">Select substance...</option>
                        {substances.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="datetime-local"
                        value={intake.time.slice(0, 16)}
                        onChange={(e) => updateIntake(index, { time: new Date(e.target.value).toISOString() })}
                        className="form-input text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
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
                    <td className="px-3 py-2">
                      <NumberInput
                        value={intake.timeAfterMeal ? String(intake.timeAfterMeal) : ''}
                        onChange={(v) => updateIntake(index, { timeAfterMeal: v ? Number(v) : null })}
                        step={1}
                        min={0}
                        placeholder="minutes"
                        className="form-input--compact"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <NumberInput
                        value={String(intake.dosageMg)}
                        onChange={(v) => updateIntake(index, { dosageMg: Number(v) })}
                        step={0.1}
                        min={0}
                        placeholder="mg"
                        className="form-input--compact"
                      />
                    </td>
                    <td className="px-3 py-2">
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
            onClick={calculateBloodLevels}
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
                    {substance} Blood Levels
                  </h3>
                  <LineChart
                    data={substanceData}
                    width={400}
                    height={200}
                    color="#3b82f6"
                    className="w-full"
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
                      <span className="font-medium" style={{ color: 'var(--fg)' }}>{substance}</span>
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
          <div className="rounded-xl p-12 flex items-center justify-center" style={{ background: 'var(--input-bg)' }}>
            <div className="text-center">
              <span className="text-5xl mb-4 block">📊</span>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Add substance intakes above and calculate to see blood level graphs
              </p>
            </div>
          </div>
        )}
      </CardSection>
    </div>
  );
};

export default BloodLevelCalculator;
