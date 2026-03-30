'use client';

import React from 'react';

interface EnergyBreakdownProps {
  totalKcal: number | null;
  potentialKcal: number | null;
  kineticKcal: number | null;
  isometricKcal: number | null;
  label?: string;
}

const COLORS = {
  potential: 'bg-blue-500',
  kinetic: 'bg-amber-500',
  isometric: 'bg-purple-500',
};

const DOT_COLORS = {
  potential: 'bg-blue-500',
  kinetic: 'bg-amber-500',
  isometric: 'bg-purple-500',
};

export default function EnergyBreakdown({
  totalKcal,
  potentialKcal,
  kineticKcal,
  isometricKcal,
  label = 'Energy',
}: EnergyBreakdownProps) {
  const allNull =
    totalKcal === null &&
    potentialKcal === null &&
    kineticKcal === null &&
    isometricKcal === null;

  if (allNull) {
    return (
      <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          No energy data
        </p>
      </div>
    );
  }

  const potential = potentialKcal ?? 0;
  const kinetic = kineticKcal ?? 0;
  const isometric = isometricKcal ?? 0;
  const componentSum = potential + kinetic + isometric;

  const potentialPct = componentSum > 0 ? (potential / componentSum) * 100 : 0;
  const kineticPct = componentSum > 0 ? (kinetic / componentSum) * 100 : 0;
  const isometricPct = componentSum > 0 ? (isometric / componentSum) * 100 : 0;

  const components = [
    { key: 'potential', label: 'Potential', kcal: potential, pct: potentialPct, color: COLORS.potential, dot: DOT_COLORS.potential },
    { key: 'kinetic', label: 'Kinetic', kcal: kinetic, pct: kineticPct, color: COLORS.kinetic, dot: DOT_COLORS.kinetic },
    { key: 'isometric', label: 'Isometric', kcal: isometric, pct: isometricPct, color: COLORS.isometric, dot: DOT_COLORS.isometric },
  ];

  return (
    <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
      {/* Total */}
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className="text-sm font-semibold text-slate-900 dark:text-white">
          {totalKcal !== null ? `${totalKcal.toFixed(1)} kcal` : '-- kcal'}
        </span>
      </div>

      {/* Bar */}
      {componentSum > 0 && (
        <div className="mb-2 flex h-2 overflow-hidden rounded-full">
          {components.map(
            (c) =>
              c.pct > 0 && (
                <div
                  key={c.key}
                  className={`${c.color}`}
                  style={{ width: `${c.pct}%` }}
                />
              ),
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {components.map((c) => (
          <div key={c.key} className="flex items-center gap-1">
            <span
              className={`inline-block h-2 w-2 rounded-full ${c.dot}`}
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {c.label} {c.kcal.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
