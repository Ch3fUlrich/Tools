/* global setInterval, clearInterval */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import CardSection from '@/components/ui/CardSection';
import ErrorAlert from '@/components/ui/ErrorAlert';
import Button from '@/components/ui/Button';
import {
  startSession, listSessions, getSession, updateSession, logSet, deleteSet,
  listPlans, listExercises,
  type WorkoutSessionDetail, type TrainingPlan, type Exercise,
} from '@/lib/api/client';
import EnergyBreakdown from './EnergyBreakdown';

// ── Elapsed timer ─────────────────────────────────────────────────────────────
function useElapsed(startedAt: string | null): string {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!startedAt) { setElapsed(''); return; }
    const tick = () => {
      const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      setElapsed(h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return elapsed;
}

// ── Set row state ─────────────────────────────────────────────────────────────
interface SetRow {
  exerciseId: string;
  setNumber: number;
  weightKg: string;
  reps: string;
  rpe: string;
  isWarmup: boolean;
  isDropset: boolean;
  isFailure: boolean;
  savedId: string | null;
  saving: boolean;
  energyKcal: number | null;
  energyPotentialKcal: number | null;
  energyKineticKcal: number | null;
  energyIsometricKcal: number | null;
}

function emptyRow(exerciseId: string, setNumber: number): SetRow {
  return { exerciseId, setNumber, weightKg: '', reps: '', rpe: '', isWarmup: false, isDropset: false, isFailure: false, savedId: null, saving: false, energyKcal: null, energyPotentialKcal: null, energyKineticKcal: null, energyIsometricKcal: null };
}

// ── Exercise group ─────────────────────────────────────────────────────────────
interface ExGroup {
  exerciseId: string;
  exerciseName: string;
  sets: SetRow[];
}

export default function ActiveWorkout() {
  const [session, setSession] = useState<WorkoutSessionDetail | null>(null);
  const [groups, setGroups] = useState<ExGroup[]>([]);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [addExerciseId, setAddExerciseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const elapsed = useElapsed(session?.startedAt ?? null);

  // Load plans + exercises + check for in-progress session
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [plansRes, exRes, sessRes] = await Promise.all([
          listPlans(),
          listExercises(),
          listSessions({ status: 'in_progress' }),
        ]);
        setPlans(plansRes.plans);
        setExercises(exRes.exercises);
        if (sessRes.sessions.length > 0) {
          const full = await getSession(sessRes.sessions[0].id);
          loadSession(full);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  function loadSession(full: WorkoutSessionDetail) {
    setSession(full);
    // Build groups from existing sets
    const groupMap: Record<string, ExGroup> = {};
    for (const s of full.sets) {
      if (!groupMap[s.exerciseId]) {
        groupMap[s.exerciseId] = { exerciseId: s.exerciseId, exerciseName: s.exerciseName, sets: [] };
      }
      groupMap[s.exerciseId].sets.push({
        exerciseId: s.exerciseId, setNumber: s.setNumber,
        weightKg: String(s.weightKg), reps: String(s.reps), rpe: s.rpe != null ? String(s.rpe) : '',
        isWarmup: s.isWarmup, isDropset: s.isDropset, isFailure: s.isFailure,
        savedId: s.id, saving: false,
        energyKcal: s.energyKcal, energyPotentialKcal: s.energyPotentialKcal,
        energyKineticKcal: s.energyKineticKcal, energyIsometricKcal: s.energyIsometricKcal,
      });
    }
    setGroups(Object.values(groupMap));
  }

  async function handleStart(planId?: string) {
    setActionLoading(true);
    setError(null);
    try {
      const name = planId
        ? (plans.find(p => p.id === planId)?.name ?? 'Workout') + ' — ' + new Date().toLocaleDateString()
        : 'Workout — ' + new Date().toLocaleDateString();
      const { id } = await startSession({ name, planId });
      const full = await getSession(id);
      loadSession(full);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start session');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRepeatLast() {
    try {
      const res = await listSessions({ status: 'completed' });
      const last = res.sessions[0];
      if (!last) { setError('No completed sessions to repeat'); return; }
      await handleStart(last.planId ?? undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function handleComplete() {
    if (!session) return;
    setActionLoading(true);
    try {
      await updateSession(session.id, { status: 'completed' });
      setSession(null);
      setGroups([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to complete session');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!session) return;
    setActionLoading(true);
    try {
      await updateSession(session.id, { status: 'cancelled' });
      setSession(null);
      setGroups([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  function addExerciseGroup() {
    if (!addExerciseId) return;
    const ex = exercises.find(e => e.id === addExerciseId);
    if (!ex) return;
    if (groups.some(g => g.exerciseId === addExerciseId)) { setAddExerciseId(''); return; }
    setGroups(prev => [...prev, { exerciseId: addExerciseId, exerciseName: ex.name, sets: [emptyRow(addExerciseId, 1)] }]);
    setAddExerciseId('');
  }

  function addSetToGroup(exerciseId: string) {
    setGroups(prev => prev.map(g => {
      if (g.exerciseId !== exerciseId) return g;
      return { ...g, sets: [...g.sets, emptyRow(exerciseId, g.sets.length + 1)] };
    }));
  }

  function updateSetField(exerciseId: string, setIdx: number, field: string, value: string | boolean) {
    setGroups(prev => prev.map(g => {
      if (g.exerciseId !== exerciseId) return g;
      const sets = g.sets.map((s, i) => i === setIdx ? { ...s, [field]: value } : s);
      return { ...g, sets };
    }));
  }

  const saveSet = useCallback(async (exerciseId: string, setIdx: number) => {
    if (!session) return;
    setGroups(prev => prev.map(g => {
      if (g.exerciseId !== exerciseId) return g;
      const sets = g.sets.map((s, i) => i === setIdx ? { ...s, saving: true } : s);
      return { ...g, sets };
    }));
    try {
      const g = groups.find(g => g.exerciseId === exerciseId);
      if (!g) return;
      const s = g.sets[setIdx];
      const res = await logSet(session.id, {
        exerciseId: s.exerciseId, setNumber: s.setNumber,
        weightKg: parseFloat(s.weightKg) || 0, reps: parseInt(s.reps) || 0,
        rpe: s.rpe ? parseFloat(s.rpe) : undefined,
        isWarmup: s.isWarmup, isDropset: s.isDropset, isFailure: s.isFailure,
      });
      setGroups(prev => prev.map(g => {
        if (g.exerciseId !== exerciseId) return g;
        const sets = g.sets.map((set, i) => i === setIdx ? {
          ...set, savedId: res.id, saving: false,
          energyKcal: res.energyKcal, energyPotentialKcal: res.energyPotentialKcal,
          energyKineticKcal: res.energyKineticKcal, energyIsometricKcal: res.energyIsometricKcal,
        } : set);
        return { ...g, sets };
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save set');
      setGroups(prev => prev.map(g => {
        if (g.exerciseId !== exerciseId) return g;
        const sets = g.sets.map((s, i) => i === setIdx ? { ...s, saving: false } : s);
        return { ...g, sets };
      }));
    }
  }, [session, groups]);

  async function handleDeleteSet(exerciseId: string, setIdx: number) {
    if (!session) return;
    const g = groups.find(g => g.exerciseId === exerciseId);
    if (!g) return;
    const s = g.sets[setIdx];
    if (s.savedId) {
      try { await deleteSet(session.id, s.savedId); } catch { /* ignore */ }
    }
    setGroups(prev => prev.map(g => {
      if (g.exerciseId !== exerciseId) return g;
      const sets = g.sets.filter((_, i) => i !== setIdx).map((s, i) => ({ ...s, setNumber: i + 1 }));
      return { ...g, sets };
    }));
  }

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
      {groups.map(group => (
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
            .filter(e => !groups.some(g => g.exerciseId === e.id))
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
