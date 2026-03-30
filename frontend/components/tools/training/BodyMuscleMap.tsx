/* global SVGPathElement */
'use client';

import React, { useState, useMemo } from 'react';
import { type MuscleEnergyData } from '@/lib/api/client';

interface BodyMuscleMapProps {
  data: MuscleEnergyData[];
  normalizeBySize: boolean;
  onToggleNormalize: () => void;
}

/* ------------------------------------------------------------------ */
/*  Muscle region SVG definitions                                     */
/*  Each region is a simple path/shape positioned on a 200x400 body   */
/* ------------------------------------------------------------------ */

interface MuscleRegion {
  svgRegionId: string;
  label: string;
  view: 'front' | 'back';
  /** SVG <path> d-attribute */
  d: string;
}

const MUSCLE_REGIONS: MuscleRegion[] = [
  // ──── FRONT VIEW ────
  {
    svgRegionId: 'neck',
    label: 'Neck',
    view: 'front',
    d: 'M 88,68 Q 88,60 100,58 Q 112,60 112,68 L 112,80 Q 112,82 100,82 Q 88,82 88,80 Z',
  },
  {
    svgRegionId: 'chest',
    label: 'Chest',
    view: 'front',
    d: 'M 68,96 Q 72,88 100,86 Q 128,88 132,96 L 134,120 Q 130,128 100,130 Q 70,128 66,120 Z',
  },
  {
    svgRegionId: 'front_deltoid',
    label: 'Front Deltoid',
    view: 'front',
    d: 'M 56,88 Q 62,82 68,86 L 68,96 L 66,108 Q 56,106 52,100 Z',
  },
  {
    svgRegionId: 'side_deltoid',
    label: 'Side Deltoid',
    view: 'front',
    d: 'M 132,96 Q 128,88 134,82 L 144,88 Q 148,100 134,108 Z',
  },
  {
    svgRegionId: 'biceps',
    label: 'Biceps',
    view: 'front',
    d: 'M 50,110 L 56,108 L 60,112 L 60,148 Q 56,152 50,148 Z M 140,112 L 144,108 L 150,110 L 150,148 Q 144,152 140,148 Z',
  },
  {
    svgRegionId: 'forearms',
    label: 'Forearms',
    view: 'front',
    d: 'M 48,154 L 62,154 L 62,200 Q 56,204 48,200 Z M 138,154 L 152,154 L 152,200 Q 144,204 138,200 Z',
  },
  {
    svgRegionId: 'abs',
    label: 'Abs',
    view: 'front',
    d: 'M 84,132 L 116,132 L 116,190 Q 112,196 100,198 Q 88,196 84,190 Z',
  },
  {
    svgRegionId: 'obliques',
    label: 'Obliques',
    view: 'front',
    d: 'M 68,128 L 84,132 L 84,190 Q 78,194 72,186 L 66,160 Z M 116,132 L 132,128 L 134,160 Q 128,186 122,194 Q 116,190 116,190 Z',
  },
  {
    svgRegionId: 'hip_flexors',
    label: 'Hip Flexors',
    view: 'front',
    d: 'M 78,198 L 92,200 L 90,220 L 76,216 Z M 108,200 L 122,198 L 124,216 L 110,220 Z',
  },
  {
    svgRegionId: 'quadriceps',
    label: 'Quadriceps',
    view: 'front',
    d: 'M 72,220 L 94,222 L 96,310 Q 88,314 76,310 L 72,260 Z M 106,222 L 128,220 L 128,260 L 124,310 Q 112,314 104,310 Z',
  },
  // ──── BACK VIEW ────
  {
    svgRegionId: 'rear_deltoid',
    label: 'Rear Deltoid',
    view: 'back',
    d: 'M 52,88 Q 58,82 66,86 L 66,100 Q 56,106 50,98 Z M 134,86 Q 142,82 148,88 L 150,98 Q 144,106 134,100 Z',
  },
  {
    svgRegionId: 'triceps',
    label: 'Triceps',
    view: 'back',
    d: 'M 48,108 L 58,106 L 60,148 Q 54,152 48,148 Z M 142,106 L 152,108 L 152,148 Q 146,152 140,148 Z',
  },
  {
    svgRegionId: 'upper_back',
    label: 'Upper Back',
    view: 'back',
    d: 'M 76,86 Q 88,82 100,82 Q 112,82 124,86 L 126,108 Q 114,112 100,112 Q 86,112 74,108 Z',
  },
  {
    svgRegionId: 'lats',
    label: 'Lats',
    view: 'back',
    d: 'M 66,108 L 76,106 L 78,156 Q 72,160 66,152 Z M 124,106 L 134,108 L 134,152 Q 128,160 122,156 Z',
  },
  {
    svgRegionId: 'lower_back',
    label: 'Lower Back',
    view: 'back',
    d: 'M 78,114 L 122,114 L 124,170 Q 112,176 100,178 Q 88,176 76,170 Z',
  },
  {
    svgRegionId: 'glutes',
    label: 'Glutes',
    view: 'back',
    d: 'M 72,178 L 100,184 L 128,178 L 130,212 Q 118,222 100,224 Q 82,222 70,212 Z',
  },
  {
    svgRegionId: 'hamstrings',
    label: 'Hamstrings',
    view: 'back',
    d: 'M 72,224 L 94,228 L 96,320 Q 88,324 76,318 Z M 106,228 L 128,224 L 128,318 Q 116,324 104,320 Z',
  },
  {
    svgRegionId: 'calves',
    label: 'Calves',
    view: 'back',
    d: 'M 76,326 L 94,324 L 92,380 Q 86,386 78,380 Z M 106,324 L 124,326 L 122,380 Q 114,386 108,380 Z',
  },
];

/* ------------------------------------------------------------------ */
/*  Simplified body outline (decorative, not interactive)             */
/* ------------------------------------------------------------------ */

function BodyOutline({ view }: { view: 'front' | 'back' }) {
  return (
    <g stroke="currentColor" strokeWidth="1.2" fill="none" className="text-slate-400 dark:text-slate-500">
      {/* Head */}
      <ellipse cx="100" cy="40" rx="22" ry="26" />
      {/* Neck */}
      <rect x="92" y="62" width="16" height="20" rx="4" />
      {/* Torso */}
      <path d="M 66,84 Q 60,82 52,88 L 48,108 L 46,154 L 48,200 L 66,160 L 72,198 Q 82,222 100,226 Q 118,222 128,198 L 134,160 L 152,200 L 154,154 L 152,108 L 148,88 Q 140,82 134,84 Q 118,80 100,80 Q 82,80 66,84 Z" />
      {/* Left arm */}
      <path d="M 52,88 L 46,108 L 44,154 L 46,200 L 62,204 L 64,154 L 62,108 Z" />
      {/* Right arm */}
      <path d="M 148,88 L 154,108 L 156,154 L 154,200 L 138,204 L 136,154 L 138,108 Z" />
      {/* Left leg */}
      <path d="M 72,216 L 70,260 L 72,320 L 74,380 L 94,386 L 96,320 L 96,260 L 94,216 Z" />
      {/* Right leg */}
      <path d="M 106,216 L 104,260 L 104,320 L 106,380 L 126,386 L 128,320 L 130,260 L 128,216 Z" />
      {/* Label */}
      <text
        x="100"
        y="396"
        textAnchor="middle"
        className="text-[10px] fill-slate-500 dark:fill-slate-400"
        stroke="none"
      >
        {view === 'front' ? 'Front' : 'Back'}
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Tooltip                                                           */
/* ------------------------------------------------------------------ */

interface TooltipInfo {
  x: number;
  y: number;
  label: string;
  energyKcal: number;
  ratio: number | null;
}

/* ------------------------------------------------------------------ */
/*  Color helpers                                                     */
/* ------------------------------------------------------------------ */

function energyToColor(value: number, maxValue: number): string {
  if (maxValue <= 0) return 'hsl(240,60%,60%)';
  const ratio = Math.min(value / maxValue, 1);
  // hue: 240 (blue) -> 0 (red)
  const hue = 240 * (1 - ratio);
  return `hsl(${hue},75%,50%)`;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function BodyMuscleMap({ data, normalizeBySize, onToggleNormalize }: BodyMuscleMapProps) {
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  // Build a lookup: svgRegionId -> MuscleEnergyData
  const dataMap = useMemo(() => {
    const m = new Map<string, MuscleEnergyData>();
    for (const d of data) {
      m.set(d.svgRegionId, d);
    }
    return m;
  }, [data]);

  // Calculate display values & max
  const { valueMap, maxValue, minValue } = useMemo(() => {
    const vm = new Map<string, number>();
    let max = 0;
    let min = Infinity;
    for (const d of data) {
      const v = normalizeBySize && d.relativeSize > 0 ? d.energyKcal / d.relativeSize : d.energyKcal;
      vm.set(d.svgRegionId, v);
      if (v > max) max = v;
      if (v > 0 && v < min) min = v;
    }
    if (min === Infinity) min = 0;
    return { valueMap: vm, maxValue: max, minValue: min };
  }, [data, normalizeBySize]);

  function getFill(regionId: string): string {
    const v = valueMap.get(regionId);
    if (v === undefined || v === 0) return ''; // handled via className
    return energyToColor(v, maxValue);
  }

  function isNeutral(regionId: string): boolean {
    const v = valueMap.get(regionId);
    return v === undefined || v === 0;
  }

  function handleMouseEnter(region: MuscleRegion, e: React.MouseEvent<SVGPathElement>) {
    const entry = dataMap.get(region.svgRegionId);
    const svgEl = (e.target as SVGPathElement).ownerSVGElement;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    setTooltip({
      x: clientX,
      y: clientY,
      label: entry?.displayName ?? region.label,
      energyKcal: entry?.energyKcal ?? 0,
      ratio:
        normalizeBySize && entry && entry.relativeSize > 0
          ? entry.energyKcal / entry.relativeSize
          : null,
    });
  }

  function handleMouseLeave() {
    setTooltip(null);
  }

  function renderView(view: 'front' | 'back', _idx: number) {
    const regions = MUSCLE_REGIONS.filter((r) => r.view === view);
    return (
      <div key={view} className="relative flex-1 min-w-[180px]">
        <svg
          viewBox="0 0 200 400"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          aria-label={`${view} body muscle map`}
        >
          <BodyOutline view={view} />
          {regions.map((region) => {
            const neutral = isNeutral(region.svgRegionId);
            return (
              <path
                key={region.svgRegionId}
                id={region.svgRegionId}
                d={region.d}
                fill={neutral ? undefined : getFill(region.svgRegionId)}
                className={
                  neutral
                    ? 'fill-slate-200 dark:fill-slate-700 stroke-slate-400 dark:stroke-slate-500'
                    : 'stroke-slate-600 dark:stroke-slate-300'
                }
                strokeWidth="0.8"
                opacity={0.85}
                style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={(e) => handleMouseEnter(region, e)}
                onMouseMove={(e) => handleMouseEnter(region, e)}
                onMouseLeave={handleMouseLeave}
              />
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-50 rounded-md bg-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y - 10,
              whiteSpace: 'nowrap',
            }}
          >
            <p className="font-semibold">{tooltip.label}</p>
            <p>Energy: {tooltip.energyKcal.toFixed(1)} kcal</p>
            {tooltip.ratio !== null && (
              <p>Normalized: {tooltip.ratio.toFixed(2)} kcal/size</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Body views */}
      <div className="flex flex-col sm:flex-row gap-2 justify-center items-start">
        {renderView('front', 0)}
        {renderView('back', 1)}
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-3 justify-center text-xs text-slate-600 dark:text-slate-400">
        <span>{minValue > 0 ? minValue.toFixed(1) : '0'} {normalizeBySize ? 'kcal/size' : 'kcal'}</span>
        <div
          className="h-3 w-40 rounded-sm"
          style={{
            background: 'linear-gradient(to right, hsl(240,75%,50%), hsl(180,75%,50%), hsl(120,75%,50%), hsl(60,75%,50%), hsl(0,75%,50%))',
          }}
        />
        <span>{maxValue > 0 ? maxValue.toFixed(1) : '0'} {normalizeBySize ? 'kcal/size' : 'kcal'}</span>
      </div>

      {/* Normalize toggle */}
      <label className="flex items-center justify-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={normalizeBySize}
          onChange={onToggleNormalize}
          className="rounded border-slate-400 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-700"
        />
        Normalize by muscle size
      </label>
    </div>
  );
}
