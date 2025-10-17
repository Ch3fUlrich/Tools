'use client';

import { useState } from 'react';
import { calculateFatLoss, FatLossResponse } from '@/lib/api/client';

export default function FatLossCalculator() {
  const [kcalDeficit, setKcalDeficit] = useState<string>('');
  const [weightLoss, setWeightLoss] = useState<string>('');
  const [result, setResult] = useState<FatLossResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await calculateFatLoss({
        kcal_deficit: parseFloat(kcalDeficit),
        weight_loss_kg: parseFloat(weightLoss),
      });
      setResult(response);
    } catch {
      setError('Failed to calculate. Please check your inputs.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-white">
        Fat Loss Calculator
      </h2>
      
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold mb-2 text-sm sm:text-base text-gray-900 dark:text-white">How it works:</h3>
        <ul className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <li>• 1kg of fat = 7000 kcal</li>
          <li>• 1kg of muscle = 1200 kcal</li>
          <li>• Calculate what percentage of your weight loss is fat vs muscle</li>
        </ul>
      </div>

      <form onSubmit={handleCalculate} className="space-y-4 sm:space-y-6">
        <div>
          <label 
            htmlFor="kcalDeficit" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Calorie Deficit (kcal)
          </label>
          <input
            type="number"
            id="kcalDeficit"
            value={kcalDeficit}
            onChange={(e) => setKcalDeficit(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
            placeholder="e.g., 3500"
            required
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label 
            htmlFor="weightLoss" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Weight Loss (kg)
          </label>
          <input
            type="number"
            id="weightLoss"
            value={weightLoss}
            onChange={(e) => setWeightLoss(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
            placeholder="e.g., 0.5"
            required
            min="0"
            step="0.01"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors duration-200 text-sm sm:text-base"
        >
          {loading ? 'Calculating...' : 'Calculate'}
        </button>
      </form>

      {error && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm sm:text-base text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {result && result.is_valid && (
        <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">Results:</h3>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">Fat Loss:</span>
              <span className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                {result.fat_loss_percentage?.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">Muscle Loss:</span>
              <span className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                {result.muscle_loss_percentage?.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {result && !result.is_valid && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm sm:text-base text-yellow-800 dark:text-yellow-300">
            Invalid calculation. Please check that your calorie deficit and weight loss values are reasonable.
          </p>
        </div>
      )}
    </div>
  );
}
