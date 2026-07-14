import { useState, useEffect, useCallback } from 'react';
import {
  startSession, listSessions, getSession, updateSession, logSet, deleteSet,
  listPlans, listExercises,
  type WorkoutSessionDetail, type TrainingPlan, type Exercise,
} from '@/lib/api/client';

export interface SetRow {
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

export function emptyRow(exerciseId: string, setNumber: number): SetRow {
  return { exerciseId, setNumber, weightKg: '', reps: '', rpe: '', isWarmup: false, isDropset: false, isFailure: false, savedId: null, saving: false, energyKcal: null, energyPotentialKcal: null, energyKineticKcal: null, energyIsometricKcal: null };
}

export interface ExGroup {
  exerciseId: string;
  exerciseName: string;
  sets: SetRow[];
}

export function useActiveWorkout() {
  const [session, setSession] = useState<WorkoutSessionDetail | null>(null);
  const [groups, setGroups] = useState<ExGroup[]>([]);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [addExerciseId, setAddExerciseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return {
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
  };
}
