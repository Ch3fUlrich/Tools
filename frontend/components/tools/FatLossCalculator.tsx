/* global HTMLDivElement, MouseEvent, Node */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import NumberInput from '@/components/ui/NumberInput';
import { calculateFatLoss, type FatLossResponse } from '../../lib/api/client';
import FatLossVisualization from './FatLossVisualization';

export const FatLossCalculator: React.FC = () => {
  const [kcalDeficit, setKcalDeficit] = useState<string>('');
  const [weightLoss, setWeightLoss] = useState<string>('');
  const [result, setResult] = useState<FatLossResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  // Close info tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setShowInfo(false);
      }
    };

    if (showInfo) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await calculateFatLoss({
        kcal_deficit: parseFloat(kcalDeficit),
        weight_loss_kg: parseFloat(weightLoss),
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setKcalDeficit('');
    setWeightLoss('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Enhanced Header */}
      <div className="text-center animate-fade-in-up">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-emerald-600 rounded-2xl shadow-soft-lg">
            <span className="text-3xl">🏋️</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Fat Loss Calculator
          </h1>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
          Calculate the percentage of fat vs muscle loss based on your calorie deficit and weight loss
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Enhanced Input Form */}
        <div className="card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-emerald-600 rounded-full mr-4"></div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Input Parameters
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label
                htmlFor="kcalDeficit"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Daily Calorie Deficit
              </label>
              <NumberInput
                id="kcalDeficit"
                value={kcalDeficit}
                onChange={(v) => setKcalDeficit(v)}
                step={100}
                min={0}
                placeholder="e.g., 500"
                unit="kcal/day"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                💡 Recommended: 300-500 kcal deficit for sustainable weight loss
              </p>
            </div>

            <div className="space-y-3">
              <label
                htmlFor="weightLoss"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Weekly Weight Loss
              </label>
              <NumberInput
                id="weightLoss"
                value={weightLoss}
                onChange={(v) => setWeightLoss(v)}
                step={0.1}
                min={0}
                placeholder="e.g., 0.5"
                unit="kg/week"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                💡 Healthy range: 0.2-1.0 kg per week
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 h-12 text-base font-semibold shadow-soft-lg hover:shadow-soft-xl transition-all duration-300 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner mr-3" />
                    Calculating...
                  </div>
                ) : (
                  'Calculate Composition'
                )}
              </button>

              {/* Enhanced Info Button */}
              <div className="relative" ref={infoRef}>
                <button
                  type="button"
                  onClick={() => setShowInfo(!showInfo)}
                  className="w-12 h-12 btn-ghost flex items-center justify-center hover:scale-105 transition-transform duration-200"
                  title="Information about calculation method and sources"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                {/* Enhanced Info Tooltip */}
                {showInfo && (
                  <div className="absolute bottom-full right-0 mb-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-soft-lg border border-slate-200 dark:border-slate-700 p-4 z-10 animate-scale-in">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-900 dark:text-white">Calculation Method</h4>
                      <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                        <p>
                          <strong>Formula:</strong> The calculator uses a simplified model based on research from sports science and nutrition studies.
                        </p>
                        <p>
                          <strong>Factors considered:</strong>
                        </p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>Calorie deficit magnitude</li>
                          <li>Rate of weight loss</li>
                          <li>Typical body composition ratios</li>
                          <li>Metabolic adaptations</li>
                        </ul>
                        <p>
                          <strong>Sources:</strong>
                        </p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>International Journal of Obesity</li>
                          <li>American Journal of Clinical Nutrition</li>
                          <li>Research by Dr. Layne Norton</li>
                          <li>Body recomposition studies</li>
                        </ul>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                          <em>Note: This is an estimation tool. Individual results may vary based on genetics, training, and nutrition.</em>
                        </p>
                      </div>
                    </div>
                    <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white dark:border-t-slate-800"></div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="btn-ghost h-12 px-6 hover:scale-105 transition-transform duration-200"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Enhanced Results Display */}
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in-up">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800 dark:text-red-300 font-medium">{error}</p>
              </div>
            </div>
          )}

          {result && result.is_valid && (
            <div className="card animate-scale-in" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center mb-6">
                <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full mr-4"></div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Body Composition Results
                </h2>
              </div>

              <div className="space-y-6">
                {/* Enhanced Fat Loss Result */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-lg">🔥</span>
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Fat Loss</span>
                    </div>
                    <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {result.fat_loss_percentage?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                    <div
                      className="bg-gradient-to-r from-green-400 to-emerald-500 h-4 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${Math.min(result.fat_loss_percentage || 0, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-3">
                    Estimated fat loss from total weight loss
                  </p>
                </div>

                {/* Enhanced Muscle Loss Result */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-lg">💪</span>
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Muscle Loss</span>
                    </div>
                    <span className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {result.muscle_loss_percentage?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                    <div
                      className="bg-gradient-to-r from-orange-400 to-red-500 h-4 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${Math.min(result.muscle_loss_percentage || 0, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-3">
                    Estimated muscle loss - aim to minimize this
                  </p>
                </div>

                {/* Enhanced Summary */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">📊</span>
                    </div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">Summary</h3>
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                    {result.fat_loss_percentage && result.fat_loss_percentage > 70
                      ? "🎉 Excellent! Most of your weight loss is coming from fat. Keep up the good work!"
                      : result.fat_loss_percentage && result.fat_loss_percentage > 50
                      ? "👍 Good progress! Focus on maintaining muscle mass through resistance training."
                      : "⚠️ Consider adjusting your approach. Strength training and adequate protein intake can help preserve muscle."
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {result && !result.is_valid && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg animate-fade-in-up">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                  Invalid calculation. Please check that your calorie deficit and weight loss values are reasonable and within healthy ranges.
                </p>
              </div>
            </div>
          )}

          {/* Enhanced Info Card */}
          {!result && !error && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 animate-fade-in-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">💡</span>
                </div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">How it works</h3>
              </div>
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <p>• Enter your daily calorie deficit and weekly weight loss</p>
                <p>• The calculator estimates fat vs muscle loss ratio</p>
                <p>• Healthy fat loss: 70%+ of weight loss from fat</p>
                <p>• Combine with strength training for best results</p>
              </div>
            </div>
          )}

          {/* Visualization */}
          {result && result.is_valid && (
            <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <FatLossVisualization
                currentKcalDeficit={parseFloat(kcalDeficit)}
                currentWeightLoss={parseFloat(weightLoss)}
                currentFatLoss={result.fat_loss_percentage}
                currentMuscleLoss={result.muscle_loss_percentage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FatLossCalculator;