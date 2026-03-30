'use client';

import React from 'react';
import NumberInput from '@/components/ui/NumberInput';
import Button from '@/components/ui/Button';

interface SetLoggerProps {
  setNumber: number;
  exerciseName: string;
  weightKg: string;
  reps: string;
  rpe: string;
  tempoEccentricS: string;
  tempoPauseBottomS: string;
  tempoConcentricS: string;
  tempoPauseTopS: string;
  isWarmup: boolean;
  isDropset: boolean;
  isFailure: boolean;
  energyKcal: number | null;
  energyPotentialKcal: number | null;
  energyKineticKcal: number | null;
  energyIsometricKcal: number | null;
  onChange: (field: string, value: string | boolean) => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
  saved: boolean;
}

const RPE_OPTIONS = [
  { value: '', label: '-' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
  { value: '10', label: '10' },
];

export default function SetLogger({
  setNumber,
  exerciseName,
  weightKg,
  reps,
  rpe,
  tempoEccentricS,
  tempoPauseBottomS,
  tempoConcentricS,
  tempoPauseTopS,
  isWarmup,
  isDropset,
  isFailure,
  energyKcal,
  energyPotentialKcal,
  energyKineticKcal,
  energyIsometricKcal,
  onChange,
  onSave,
  onDelete,
  saving,
  saved,
}: SetLoggerProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
      {/* Set number */}
      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-7 text-center flex-shrink-0">
        #{setNumber}
      </span>

      {/* Weight */}
      <div className="flex flex-col">
        <label className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
          Weight (kg)
        </label>
        <div className="w-24">
          <NumberInput
            value={weightKg}
            onChange={(v) => onChange('weightKg', v)}
            step={2.5}
            min={0}
            ariaLabel={`Set ${setNumber} weight for ${exerciseName}`}
          />
        </div>
      </div>

      {/* Reps */}
      <div className="flex flex-col">
        <label className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
          Reps
        </label>
        <div className="w-20">
          <NumberInput
            value={reps}
            onChange={(v) => onChange('reps', v)}
            step={1}
            min={0}
            ariaLabel={`Set ${setNumber} reps for ${exerciseName}`}
          />
        </div>
      </div>

      {/* RPE select */}
      <div className="flex flex-col">
        <label className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
          RPE
        </label>
        <select
          value={rpe}
          onChange={(e) => onChange('rpe', e.target.value)}
          className="form-input w-16 text-sm py-1.5 text-gray-900 dark:text-white"
          aria-label={`Set ${setNumber} RPE for ${exerciseName}`}
        >
          {RPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tempo: E / P / C / P */}
      <div className="flex flex-col">
        <label className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
          Tempo (E/P/C/P)
        </label>
        <div className="flex items-center gap-1">
          <div className="w-14">
            <NumberInput
              value={tempoEccentricS}
              onChange={(v) => onChange('tempoEccentricS', v)}
              step={0.5}
              min={0}
              placeholder="E"
              ariaLabel={`Set ${setNumber} eccentric tempo`}
            />
          </div>
          <div className="w-14">
            <NumberInput
              value={tempoPauseBottomS}
              onChange={(v) => onChange('tempoPauseBottomS', v)}
              step={0.5}
              min={0}
              placeholder="P"
              ariaLabel={`Set ${setNumber} pause bottom tempo`}
            />
          </div>
          <div className="w-14">
            <NumberInput
              value={tempoConcentricS}
              onChange={(v) => onChange('tempoConcentricS', v)}
              step={0.5}
              min={0}
              placeholder="C"
              ariaLabel={`Set ${setNumber} concentric tempo`}
            />
          </div>
          <div className="w-14">
            <NumberInput
              value={tempoPauseTopS}
              onChange={(v) => onChange('tempoPauseTopS', v)}
              step={0.5}
              min={0}
              placeholder="P"
              ariaLabel={`Set ${setNumber} pause top tempo`}
            />
          </div>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500 dark:text-slate-400">Flags</label>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isWarmup}
              onChange={(e) => onChange('isWarmup', e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-orange-500 focus:ring-orange-500"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">Warmup</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isDropset}
              onChange={(e) => onChange('isDropset', e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-orange-500 focus:ring-orange-500"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">Dropset</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isFailure}
              onChange={(e) => onChange('isFailure', e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-orange-500 focus:ring-orange-500"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">Failure</span>
          </label>
        </div>
      </div>

      {/* Energy display (inline) */}
      {energyKcal !== null && (
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Energy</label>
          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <span className="font-semibold text-orange-600 dark:text-orange-400">
              {energyKcal.toFixed(1)} kcal
            </span>
            {energyPotentialKcal !== null && energyKineticKcal !== null && energyIsometricKcal !== null && (
              <span className="ml-1 text-slate-400 dark:text-slate-500">
                (P:{energyPotentialKcal.toFixed(1)} K:{energyKineticKcal.toFixed(1)} I:{energyIsometricKcal.toFixed(1)})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-end gap-1 ml-auto">
        {saved && (
          <span className="flex items-center text-green-600 dark:text-green-400 mr-1" aria-label="Saved">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
        <Button
          variant="primary"
          onClick={onSave}
          disabled={saving}
          className="text-xs px-3 py-1.5"
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          variant="ghost"
          onClick={onDelete}
          disabled={saving}
          className="text-xs px-2 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
