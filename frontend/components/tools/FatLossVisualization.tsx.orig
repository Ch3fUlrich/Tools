'use client';

import React from 'react';
import CardSection from '@/components/ui/CardSection';

interface FatLossVisualizationProps {
  currentKcalDeficit: number;  // daily kcal
  currentWeightLoss: number;   // kg/week
  currentFatLoss: number | null;
  currentMuscleLoss: number | null;
}

// Reproduce backend formula for a given daily deficit & weekly weight loss
function estimateFatPct(dailyDeficit: number, weeklyKg: number): number | null {
  const weeklyDeficit = dailyDeficit * 7;
  const KCAL_FAT = 7000;
  const KCAL_MUSCLE = 1200;
  if (weeklyDeficit <= 0 || weeklyKg <= 0) return null;
  const pct = ((weeklyDeficit - KCAL_MUSCLE * weeklyKg) / (KCAL_FAT - KCAL_MUSCLE)) / weeklyKg;
  if (pct < 0 || pct > 1) return null;
  return pct * 100;
}

function colorForFatPct(pct: number): string {
  if (pct < 40) return '#dc2626';
  if (pct < 50) return '#ea580c';
  if (pct < 60) return '#ca8a04';
  if (pct < 70) return '#16a34a';
  if (pct < 80) return '#0891b2';
  if (pct < 90) return '#2563eb';
  return '#7c3aed';
}

const LEGEND = [
  { label: '<40% fat (poor)', color: '#dc2626' },
  { label: '40–60%', color: '#ea580c' },
  { label: '60–70%', color: '#16a34a' },
  { label: '70–80% (good)', color: '#0891b2' },
  { label: '80%+ (great)', color: '#7c3aed' },
];

export const FatLossVisualization: React.FC<FatLossVisualizationProps> = ({
  currentKcalDeficit,
  currentWeightLoss,
  currentFatLoss,
  currentMuscleLoss,
}) => {
  // Axis ranges
  const wMin = 0.1, wMax = 2.0;   // kg/week
  const dMin = 100, dMax = 1000;  // kcal/day

  const px = (w: number) => ((w - wMin) / (wMax - wMin)) * 100;
  const py = (d: number) => 100 - ((d - dMin) / (dMax - dMin)) * 100;

  // Build scatter data — coarser grid for performance
  const dots: { cx: number; cy: number; color: string }[] = [];
  for (let d = dMin; d <= dMax; d += 30) {
    for (let w = wMin; w <= wMax; w += 0.1) {
      const pct = estimateFatPct(d, w);
      if (pct !== null) {
        dots.push({ cx: px(w), cy: py(d), color: colorForFatPct(pct) });
      }
    }
  }

  const curX = px(currentWeightLoss);
  const curY = py(currentKcalDeficit);
  const inRange = currentWeightLoss >= wMin && currentWeightLoss <= wMax &&
                  currentKcalDeficit >= dMin && currentKcalDeficit <= dMax;

  return (
    <CardSection title="Fat Loss Visualization" gradient="from-violet-500 to-purple-600">
      {/* Chart area with axis labels */}
      <div className="flex gap-2">
        {/* Y-axis label (rotated) */}
        <div className="flex items-center justify-center" style={{ width: 16 }}>
          <span style={{
            writingMode: 'vertical-rl', transform: 'rotate(180deg)',
            fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap'
          }}>
            Daily Deficit (kcal/day)
          </span>
        </div>

        <div className="flex-1">
          {/* Y tick labels + chart */}
          <div className="flex gap-1">
            <div className="flex flex-col justify-between" style={{ fontSize: 9, color: 'var(--muted)', width: 28, textAlign: 'right', paddingBottom: 2 }}>
              <span>1000</span>
              <span>750</span>
              <span>500</span>
              <span>250</span>
              <span>100</span>
            </div>

            {/* SVG scatter plot */}
            <div className="flex-1 relative rounded-lg overflow-hidden" style={{ height: 240, border: '1px solid var(--card-border)', background: 'var(--input-bg)' }}>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map(v => (
                  <React.Fragment key={v}>
                    <line x1={v} y1="0" x2={v} y2="100" stroke="currentColor" strokeWidth="0.2" opacity="0.15" />
                    <line x1="0" y1={v} x2="100" y2={v} stroke="currentColor" strokeWidth="0.2" opacity="0.15" />
                  </React.Fragment>
                ))}
                {/* Data dots */}
                {dots.map((d, i) => (
                  <circle key={i} cx={d.cx} cy={d.cy} r="0.8" fill={d.color} opacity="0.55" />
                ))}
                {/* Current point */}
                {inRange && currentFatLoss !== null && (
                  <circle cx={curX} cy={curY} r="3" fill="white" stroke="var(--accent)" strokeWidth="1.2" />
                )}
              </svg>

              {/* Tooltip for current point */}
              {inRange && currentFatLoss !== null && currentMuscleLoss !== null && (
                <div style={{
                  position: 'absolute',
                  left: `${curX}%`,
                  top: `${curY}%`,
                  transform: 'translate(-50%, -130%)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 10,
                  color: 'var(--fg)',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>Your Point</div>
                  <div>Fat: {currentFatLoss.toFixed(1)}% · Muscle: {currentMuscleLoss.toFixed(1)}%</div>
                </div>
              )}
            </div>
          </div>

          {/* X-axis ticks */}
          <div className="flex ml-7 mt-1" style={{ fontSize: 9, color: 'var(--muted)' }}>
            {[0.1, 0.5, 1.0, 1.5, 2.0].map(w => (
              <div key={w} style={{ flex: 1, textAlign: 'center' }}>{w}</div>
            ))}
          </div>
          {/* X-axis label */}
          <p className="text-center ml-7 mt-1" style={{ fontSize: 10, color: 'var(--muted)' }}>
            Weekly Weight Loss (kg/week)
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
        {LEGEND.map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color }} />
            <span className="text-xs" style={{ color: 'var(--fg-secondary)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </CardSection>
  );
};

export default FatLossVisualization;
