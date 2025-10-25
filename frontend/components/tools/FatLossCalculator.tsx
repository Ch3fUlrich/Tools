'use client';

import React, { useState, useEffect, useRef } from 'react';
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
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Fat Loss Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Estimate your body composition changes during weight loss
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <div className="w-2 h-8 bg-blue-500 rounded-full mr-3"></div>
            Input Parameters
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="kcalDeficit"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Daily Calorie Deficit (kcal)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="kcalDeficit"
                  value={kcalDeficit}
                  onChange={(e) => setKcalDeficit(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base transition-colors"
                  placeholder="e.g., 500"
                  required
                  min="0"
                  step="1"
                />
                <span className="absolute right-3 top-3 text-sm text-gray-500 dark:text-gray-400">kcal/day</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Recommended: 300-500 kcal deficit for sustainable weight loss
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="weightLoss"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Weekly Weight Loss (kg)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="weightLoss"
                  value={weightLoss}
                  onChange={(e) => setWeightLoss(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base transition-colors"
                  placeholder="e.g., 0.5"
                  required
                  min="0"
                  step="0.01"
                />
                <span className="absolute right-3 top-3 text-sm text-gray-500 dark:text-gray-400">kg/week</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Healthy range: 0.2-1.0 kg per week
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 text-base shadow-md hover:shadow-lg disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Calculating...
                  </div>
                ) : (
                  'Calculate Composition'
                )}
              </button>

              {/* Info Button */}
              <div className="relative" ref={infoRef}>
                <button
                  type="button"
                  onClick={() => setShowInfo(!showInfo)}
                  className="w-12 h-12 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg transition-colors duration-200 flex items-center justify-center"
                  title="Information about calculation method and sources"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                {/* Info Tooltip */}
                {showInfo && (
                  <div className="absolute bottom-full right-0 mb-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-10">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white">Calculation Method</h4>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
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
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          <em>Note: This is an estimation tool. Individual results may vary based on genetics, training, and nutrition.</em>
                        </p>
                      </div>
                    </div>
                    <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white dark:border-t-gray-800"></div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Results Display */}
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                <p className="text-sm text-red-800 dark:text-red-300 font-medium">{error}</p>
              </div>
            </div>
          )}

          {result && result.is_valid && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <div className="w-2 h-8 bg-green-500 rounded-full mr-3"></div>
                Body Composition Results
              </h2>

              <div className="space-y-6">
                {/* Fat Loss Result */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fat Loss</span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {result.fat_loss_percentage?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(result.fat_loss_percentage || 0, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Estimated fat loss from total weight loss
                  </p>
                </div>

                {/* Muscle Loss Result */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Muscle Loss</span>
                    <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {result.muscle_loss_percentage?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-orange-400 to-red-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(result.muscle_loss_percentage || 0, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Estimated muscle loss - aim to minimize this
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Summary</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {result.fat_loss_percentage && result.fat_loss_percentage > 70
                      ? "Excellent! Most of your weight loss is coming from fat. Keep up the good work!"
                      : result.fat_loss_percentage && result.fat_loss_percentage > 50
                      ? "Good progress! Focus on maintaining muscle mass through resistance training."
                      : "Consider adjusting your approach. Strength training and adequate protein intake can help preserve muscle."
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {result && !result.is_valid && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                  Invalid calculation. Please check that your calorie deficit and weight loss values are reasonable and within healthy ranges.
                </p>
              </div>
            </div>
          )}

          {/* Info Card */}
          {!result && !error && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">How it works</h3>
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
            <FatLossVisualization
              currentKcalDeficit={parseFloat(kcalDeficit)}
              currentWeightLoss={parseFloat(weightLoss)}
              currentFatLoss={result.fat_loss_percentage}
              currentMuscleLoss={result.muscle_loss_percentage}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default FatLossCalculator;
