"use client";

import React, { useState, useEffect } from 'react';
import NumberInput from '@/components/ui/NumberInput';
import { calculateTolerance, getToleranceSubstances, Substance, BloodLevelPoint } from '../../lib/api/client';
import LineChart from '../charts/LineChart';

interface SubstanceIntake {
  substance: string;
  time: string; // ISO string
  intakeType: string;
  timeAfterMeal: number | null;
  dosageMg: number;
}

const ToleranceCalculator: React.FC = () => {
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
    // Load available substances
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
      // Generate time points for the next 48 hours
      const now = new Date();
      const timePoints = [];
      for (let i = 0; i <= 48; i++) {
        const timePoint = new Date(now.getTime() + i * 60 * 60 * 1000); // Every hour
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
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-lg">🧪</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Tolerance Calculator
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Calculate substance elimination and blood levels over time
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="xl:col-span-1">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <div className="w-2 h-8 bg-green-500 rounded-full mr-3"></div>
              Substance Intake
            </h2>

            {/* Intake Table */}
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Substance</th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Time</th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Type</th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Time After Meal</th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Dosage (mg)</th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intakes.map((intake, index) => (
                      <tr key={index} className="border-t border-gray-200 dark:border-gray-600">
                        <td className="px-3 py-2">
                          <select
                            value={intake.substance}
                            onChange={(e) => updateIntake(index, { substance: e.target.value })}
                            className="form-input text-sm"
                          >
                            <option value="">Select substance...</option>
                            {substances.map((sub) => (
                              <option key={sub.id} value={sub.name}>
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
                              onClick={() => removeIntake(index)}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                            >
                              Remove
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
                  className="btn-primary w-full text-base mt-6 shadow-md disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <span className="spinner animate-spin mr-2 text-white" />
                    Calculating...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span className="mr-2">🧮</span>
                    Calculate Blood Levels
                  </div>
                )}
              </button>

              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-1">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <div className="w-2 h-8 bg-blue-500 rounded-full mr-3"></div>
              Blood Level Graph
            </h2>

            {bloodLevels.length > 0 ? (
              <div className="space-y-6">
                {/* Charts for each substance */}
                {Array.from(new Set(bloodLevels.map(bl => bl.substance))).map(substance => {
                  const substanceData = bloodLevels
                    .filter(bl => bl.substance === substance)
                    .map(bl => ({
                      time: bl.time,
                      value: bl.amountMg
                    }));

                  return (
                    <div key={substance} className="space-y-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
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

                {/* Summary */}
                <div className="grid grid-cols-1 gap-3">
                  {Array.from(new Set(bloodLevels.map(bl => bl.substance))).map(substance => {
                    const substanceLevels = bloodLevels.filter(bl => bl.substance === substance);
                    const maxLevel = Math.max(...substanceLevels.map(bl => bl.amountMg));
                    const currentLevel = substanceLevels[substanceLevels.length - 1]?.amountMg || 0;

                    return (
                      <div key={substance} className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-blue-900 dark:text-blue-100">{substance}</span>
                          <span className="text-sm text-blue-700 dark:text-blue-300">
                            Current: {currentLevel.toFixed(2)} mg
                          </span>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Peak: {maxLevel.toFixed(2)} mg
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <span className="text-4xl mb-2 block">📊</span>
                  <p className="text-gray-500 dark:text-gray-400">
                    Add substance intakes and calculate to see blood level graphs
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToleranceCalculator;