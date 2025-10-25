'use client';

import React from 'react';

interface FatLossVisualizationProps {
  currentKcalDeficit: number;
  currentWeightLoss: number;
  currentFatLoss: number | null;
  currentMuscleLoss: number | null;
}

export const FatLossVisualization: React.FC<FatLossVisualizationProps> = ({
  currentKcalDeficit,
  currentWeightLoss,
  currentFatLoss,
  currentMuscleLoss,
}) => {
  // Generate sample data points for visualization
  const generateDataPoints = () => {
    const points = [];
    for (let deficit = 200; deficit <= 1000; deficit += 50) {
      for (let weightLoss = 0.1; weightLoss <= 2.0; weightLoss += 0.1) {
        // Simple estimation formula (approximate)
        const estimatedFatLoss = Math.max(0, Math.min(100,
          50 + (deficit - 500) * 0.02 + (1.5 - weightLoss) * 10
        ));
        const estimatedMuscleLoss = 100 - estimatedFatLoss;

        points.push({
          kcalDeficit: deficit,
          weightLoss: weightLoss,
          fatLoss: estimatedFatLoss,
          muscleLoss: estimatedMuscleLoss,
        });
      }
    }
    return points;
  };

  const dataPoints = generateDataPoints();

  // Color functions
  const getColorForFatLoss = (fatLoss: number) => {
    if (fatLoss < 40) return '#dc2626'; // red-600
    if (fatLoss < 50) return '#ea580c'; // orange-600
    if (fatLoss < 60) return '#ca8a04'; // yellow-600
    if (fatLoss < 70) return '#16a34a'; // green-600
    if (fatLoss < 80) return '#0891b2'; // cyan-600
    if (fatLoss < 90) return '#2563eb'; // blue-600
    return '#7c3aed'; // violet-600
  };

  const getMuscleLossColor = () => '#dc2626'; // red-600

  // Scale functions
  const scaleX = (weightLoss: number) => ((weightLoss - 0.1) / (2.0 - 0.1)) * 100;
  const scaleY = (kcalDeficit: number) => ((kcalDeficit - 200) / (1000 - 200)) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
        <div className="w-2 h-8 bg-purple-500 rounded-full mr-3"></div>
        Fat Loss Visualization
      </h2>

      <div className="space-y-4">
        <div className="relative w-full h-80 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Grid lines */}
          <div className="absolute inset-0">
            {/* Horizontal grid lines */}
            {[0, 25, 50, 75, 100].map(y => (
              <div
                key={`h-${y}`}
                className="absolute w-full border-t border-gray-200 dark:border-gray-600"
                style={{ top: `${y}%` }}
              />
            ))}
            {/* Vertical grid lines */}
            {[0, 25, 50, 75, 100].map(x => (
              <div
                key={`v-${x}`}
                className="absolute h-full border-l border-gray-200 dark:border-gray-600"
                style={{ left: `${x}%` }}
              />
            ))}
          </div>

          {/* Data points */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {dataPoints.map((point, index) => (
              <circle
                key={index}
                cx={scaleX(point.weightLoss)}
                cy={100 - scaleY(point.kcalDeficit)}
                r="0.5"
                fill={point.fatLoss < 40 ? getMuscleLossColor() : getColorForFatLoss(point.fatLoss)}
                opacity="0.6"
              />
            ))}

            {/* Current calculation point */}
            {currentFatLoss !== null && currentMuscleLoss !== null && (
              <circle
                cx={scaleX(currentWeightLoss)}
                cy={100 - scaleY(currentKcalDeficit)}
                r="3"
                fill="white"
                stroke="#000"
                strokeWidth="1"
                className="animate-pulse"
              />
            )}
          </svg>

          {/* Current point marker with value */}
          {currentFatLoss !== null && currentMuscleLoss !== null && (
            <div
              className="absolute bg-black text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10"
              style={{
                left: `${scaleX(currentWeightLoss)}%`,
                top: `${100 - scaleY(currentKcalDeficit)}%`,
                transform: 'translate(-50%, -120%)'
              }}
            >
              Your Point
              <br />
              Fat: {currentFatLoss.toFixed(1)}%
              <br />
              Muscle: {currentMuscleLoss.toFixed(1)}%
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span className="text-gray-600 dark:text-gray-400">High Muscle Loss (&lt;40% Fat)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-600"></div>
            <span className="text-gray-600 dark:text-gray-400">40-50% Fat Loss</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
            <span className="text-gray-600 dark:text-gray-400">50-60% Fat Loss</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-600"></div>
            <span className="text-gray-600 dark:text-gray-400">60-70% Fat Loss</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-600"></div>
            <span className="text-gray-600 dark:text-gray-400">70-80% Fat Loss</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <span className="text-gray-600 dark:text-gray-400">80-90% Fat Loss</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-600"></div>
            <span className="text-gray-600 dark:text-gray-400">90%+ Fat Loss</span>
          </div>
        </div>

        {/* Axis labels */}
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex flex-col items-center">
            <span>Weekly Weight Loss (kg)</span>
            <div className="flex justify-between w-full mt-1 text-xs">
              <span>0.1</span>
              <span>1.0</span>
              <span>2.0</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span>Daily Calorie Deficit (kcal)</span>
            <div className="flex justify-between w-full mt-1 text-xs">
              <span>1000</span>
              <span>600</span>
              <span>200</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FatLossVisualization;