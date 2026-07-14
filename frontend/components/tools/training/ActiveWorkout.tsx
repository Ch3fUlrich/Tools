'use client';

import React from 'react';
import CardSection from '@/components/ui/CardSection';
import ErrorAlert from '@/components/ui/ErrorAlert';
import Button from '@/components/ui/Button';
import EnergyBreakdown from './EnergyBreakdown';
import { useElapsed } from '@/hooks/useElapsed';
import { useActiveWorkout } from './useActiveWorkout';

export default function ActiveWorkout() {
  const {
    session,
    groups,
    plans,
    exercises,
    selectedPlanId,
    setSelectedPlanId,
    addExerciseId,
    setAddExerciseId,
    loading,
    actionLoading,
    error,
    handleStart,
    handleRepeatLast,
    handleComplete,
    handleCancel,
    addExerciseGroup,
    addSetToGroup,
    updateSetField,
    saveSet,
    handleDeleteSet,
  } = useActiveWorkout();

  const elapsed = useElapsed(session?.startedAt ?? null);
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
      </div>
    );
  }

  // ── No session ─────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="space-y-4">
        {error && <ErrorAlert error={error} />}
        <CardSection title="Start Workout" gradient="from-orange-500 to-red-600">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Start from Plan
              </label>
              <div className="flex gap-2">
                <select
                  className="form-input flex-1"
                  value={selectedPlanId}
                  onChange={e => setSelectedPlanId(e.target.value)}
                >
                  <option value="">Select a plan…</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Button
                  variant="primary"
                  disabled={!selectedPlanId || actionLoading}
                  onClick={() => handleStart(selectedPlanId)}
                >
                  Start
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => handleStart()} disabled={actionLoading}>
                Start Empty Workout
              </Button>
              <Button variant="ghost" onClick={handleRepeatLast} disabled={actionLoading}>
                Repeat Last
              </Button>
            </div>
          </div>
        </CardSection>
      </div>
    );
  }

  // ── Active session ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {error && <ErrorAlert error={error} />}

      {/* Session header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{session.name}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{elapsed}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="success" onClick={handleComplete} disabled={actionLoading}>
            Complete
          </Button>
          <Button variant="ghost" onClick={handleCancel} disabled={actionLoading}>
            Cancel
          </Button>
        </div>
      </div>

      {/* Exercise groups */}
      {Object.values(groups).map(group => (
        <CardSection key={group.exerciseId} title={group.exerciseName} gradient="from-orange-500 to-red-600">
          <div className="space-y-3">
            {/* Set header */}
            <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
              <span className="col-span-1">#</span>
              <span className="col-span-3">Weight (kg)</span>
              <span className="col-span-2">Reps</span>
              <span className="col-span-2">RPE</span>
              <span className="col-span-4">Flags / Energy</span>
            </div>

            {group.sets.map((s, idx) => (
              <div key={idx} className="border border-slate-100 dark:border-slate-700 rounded-lg p-2 space-y-2">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-1 text-xs text-slate-500">#{s.setNumber}</span>
                  <div className="col-span-3">
                    <input
                      type="number" step="2.5" min="0"
                      className="form-input text-sm py-1 px-2"
                      placeholder="0"
                      value={s.weightKg}
                      onChange={e => updateSetField(group.exerciseId, idx, 'weightKg', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number" step="1" min="0"
                      className="form-input text-sm py-1 px-2"
                      placeholder="0"
                      value={s.reps}
                      onChange={e => updateSetField(group.exerciseId, idx, 'reps', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      className="form-input text-sm py-1"
                      value={s.rpe}
                      onChange={e => updateSetField(group.exerciseId, idx, 'rpe', e.target.value)}
                    >
                      <option value="">—</option>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                      <input type="checkbox" checked={s.isWarmup} onChange={e => updateSetField(group.exerciseId, idx, 'isWarmup', e.target.checked)} />
                      W
                    </label>
                    <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                      <input type="checkbox" checked={s.isDropset} onChange={e => updateSetField(group.exerciseId, idx, 'isDropset', e.target.checked)} />
                      D
                    </label>
                    <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                      <input type="checkbox" checked={s.isFailure} onChange={e => updateSetField(group.exerciseId, idx, 'isFailure', e.target.checked)} />
                      F
                    </label>
                  </div>
                </div>

                {/* Energy + actions */}
                <div className="flex items-center gap-2 justify-between">
                  <EnergyBreakdown
                    totalKcal={s.energyKcal}
                    potentialKcal={s.energyPotentialKcal}
                    kineticKcal={s.energyKineticKcal}
                    isometricKcal={s.energyIsometricKcal}
                    label={`Set ${s.setNumber}`}
                  />
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="primary"
                      className="text-xs py-1 px-3"
                      onClick={() => saveSet(group.exerciseId, idx)}
                      disabled={s.saving}
                    >
                      {s.saving ? '…' : s.savedId ? '✓ Saved' : 'Save'}
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-xs py-1 px-2"
                      onClick={() => handleDeleteSet(group.exerciseId, idx)}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <Button variant="ghost" className="text-sm" onClick={() => addSetToGroup(group.exerciseId)}>
              + Add Set
            </Button>
          </div>
        </CardSection>
      ))}

      {/* Add exercise */}
      <div className="flex gap-2">
        <select
          className="form-input flex-1"
          value={addExerciseId}
          onChange={e => setAddExerciseId(e.target.value)}
        >
          <option value="">Add exercise…</option>
          {exercises
            .filter(e => !groups[e.id])
            .map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))
          }
        </select>
        <Button variant="ghost" onClick={addExerciseGroup} disabled={!addExerciseId}>
          Add
        </Button>
      </div>
    </div>
  );
}
