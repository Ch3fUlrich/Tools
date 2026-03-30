"use client";

import { useState } from "react";
import NumberInput from "@/components/ui/NumberInput";

interface PlateCalculatorProps {
  totalWeight?: number;
}

const BAR_WEIGHT = 20;

const PLATE_SIZES = [20, 15, 10, 5, 2.5, 1.25] as const;

const PLATE_COLORS: Record<number, string> = {
  20: "bg-red-600",
  15: "bg-yellow-400",
  10: "bg-green-600",
  5: "bg-white border border-slate-400",
  2.5: "bg-black",
  1.25: "bg-gray-400",
};

// Width in px proportional to weight — heavier plates are thicker
const PLATE_WIDTHS: Record<number, number> = {
  20: 28,
  15: 24,
  10: 20,
  5: 16,
  2.5: 12,
  1.25: 10,
};

// Height in px — heavier plates are taller too for visual distinction
const PLATE_HEIGHTS: Record<number, number> = {
  20: 80,
  15: 72,
  10: 64,
  5: 56,
  2.5: 48,
  1.25: 40,
};

interface PlateCount {
  size: number;
  count: number;
}

function calculatePlates(weightPerSide: number): PlateCount[] {
  const plates: PlateCount[] = [];
  let remaining = weightPerSide;

  for (const size of PLATE_SIZES) {
    if (remaining >= size) {
      const count = Math.floor(remaining / size);
      plates.push({ size, count });
      remaining = Math.round((remaining - count * size) * 100) / 100;
    }
  }

  return plates;
}

function PlateRect({ size }: { size: number }) {
  const colorClass = PLATE_COLORS[size] ?? "bg-gray-300";
  const width = PLATE_WIDTHS[size] ?? 14;
  const height = PLATE_HEIGHTS[size] ?? 50;

  return (
    <div
      className={`rounded-sm ${colorClass}`}
      style={{ width, height }}
      title={`${size}kg`}
    />
  );
}

export default function PlateCalculator({ totalWeight: initialWeight }: PlateCalculatorProps) {
  const [weightStr, setWeightStr] = useState(
    initialWeight !== undefined ? String(initialWeight) : String(BAR_WEIGHT)
  );

  const weight = parseFloat(weightStr) || 0;
  const weightPerSide = Math.max(0, (weight - BAR_WEIGHT) / 2);
  const plates = calculatePlates(weightPerSide);
  const isBarOnly = weight <= BAR_WEIGHT;

  // Check if there's a remainder that can't be represented with available plates
  const platedWeight = plates.reduce((sum, p) => sum + p.size * p.count, 0);
  const remainder = Math.round((weightPerSide - platedWeight) * 100) / 100;

  // Build flat list of plate sizes for the visual (one per plate, ordered large to small)
  const plateList: number[] = [];
  for (const p of plates) {
    for (let i = 0; i < p.count; i++) {
      plateList.push(p.size);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Weight input */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Total weight (kg)
        </label>
        <NumberInput
          value={weightStr}
          onChange={setWeightStr}
          step={2.5}
          min={0}
        />
      </div>

      {/* Barbell visualization */}
      <div className="flex items-center justify-center gap-0">
        {/* Left plates (mirrored — largest closest to center) */}
        <div className="flex items-center gap-[2px] flex-row-reverse">
          {plateList.map((size, i) => (
            <PlateRect key={`left-${i}`} size={size} />
          ))}
        </div>

        {/* Left collar */}
        <div className="w-2 h-6 bg-slate-500 rounded-sm" />

        {/* Bar */}
        <div className="h-3 bg-slate-400 rounded-sm" style={{ width: 120 }} />

        {/* Right collar */}
        <div className="w-2 h-6 bg-slate-500 rounded-sm" />

        {/* Right plates (largest closest to center) */}
        <div className="flex items-center gap-[2px]">
          {plateList.map((size, i) => (
            <PlateRect key={`right-${i}`} size={size} />
          ))}
        </div>
      </div>

      {/* Text summary */}
      <div className="text-sm text-slate-700 dark:text-slate-300">
        {isBarOnly ? (
          <p>Bar only ({BAR_WEIGHT}kg)</p>
        ) : (
          <>
            <p className="font-medium">
              Per side:{" "}
              {plates.map((p, i) => (
                <span key={p.size}>
                  {i > 0 && ", "}
                  {p.count}&times;{p.size}kg
                </span>
              ))}
            </p>
            {remainder > 0 && (
              <p className="mt-1 text-amber-600 dark:text-amber-400">
                Note: {remainder}kg per side cannot be represented with standard plates.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
