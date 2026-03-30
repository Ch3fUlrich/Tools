'use client';

import React, { useState, useEffect, useCallback } from 'react';
import CardSection from '@/components/ui/CardSection';
import ErrorAlert from '@/components/ui/ErrorAlert';
import Button from '@/components/ui/Button';
import NumberInput from '@/components/ui/NumberInput';
import {
  listPlans,
  createPlan,
  getPlan,
  updatePlan,
  deletePlan,
  addPlanExercise,
  deletePlanExercise,
  listExercises,
  type TrainingPlan,
  type TrainingPlanDetail,
  type PlanExercise,
  type Exercise,
} from '@/lib/api/client';

const PLAN_TYPES = ['push', 'pull', 'legs', 'upper', 'lower', 'full_body', 'custom'] as const;

const PLAN_TYPE_COLORS: Record<string, string> = {
  push: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  pull: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  legs: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  upper: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  lower: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  full_body: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  custom: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
};

function planTypeLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TrainingPlanManager() {
  // ─── State ──────────────────────────────────────────────────────────────────
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<TrainingPlanDetail | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Create plan form
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<string>('custom');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Add exercise form
  const [addExerciseId, setAddExerciseId] = useState('');
  const [addTargetSets, setAddTargetSets] = useState('3');
  const [addTargetReps, setAddTargetReps] = useState('10');
  const [addTargetWeight, setAddTargetWeight] = useState('');

  // Loading & errors
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const loadPlans = useCallback(async () => {
    try {
      const res = await listPlans();
      setPlans(res.plans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    }
  }, []);

  const loadExercises = useCallback(async () => {
    try {
      const res = await listExercises();
      setExercises(res.exercises);
    } catch {
      // Non-critical: exercise catalog may not be populated yet
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadPlans(), loadExercises()]);
      setLoading(false);
    }
    init();
  }, [loadPlans, loadExercises]);

  const loadPlanDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const detail = await getPlan(id);
      setSelectedPlanDetail(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plan details');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      loadPlanDetail(selectedPlanId);
    } else {
      setSelectedPlanDetail(null);
    }
  }, [selectedPlanId, loadPlanDetail]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await createPlan({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        planType: newType,
      });
      setNewName('');
      setNewDescription('');
      setNewType('custom');
      setShowCreateForm(false);
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (plan: TrainingPlan) => {
    setActionLoading(true);
    setError(null);
    try {
      await updatePlan(plan.id, { isActive: !plan.isActive });
      await loadPlans();
      if (selectedPlanId === plan.id) {
        await loadPlanDetail(plan.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!selectedPlanId) return;
    if (!window.confirm('Delete this plan? This cannot be undone.')) return;
    setActionLoading(true);
    setError(null);
    try {
      await deletePlan(selectedPlanId);
      setSelectedPlanId(null);
      setSelectedPlanDetail(null);
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !addExerciseId) return;
    setActionLoading(true);
    setError(null);
    try {
      await addPlanExercise(selectedPlanId, {
        exerciseId: addExerciseId,
        targetSets: parseInt(addTargetSets, 10) || 3,
        targetReps: parseInt(addTargetReps, 10) || 10,
        targetWeightKg: addTargetWeight ? parseFloat(addTargetWeight) : undefined,
      });
      setAddExerciseId('');
      setAddTargetSets('3');
      setAddTargetReps('10');
      setAddTargetWeight('');
      await loadPlanDetail(selectedPlanId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add exercise');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExercise = async (pe: PlanExercise) => {
    if (!selectedPlanId) return;
    setActionLoading(true);
    setError(null);
    try {
      await deletePlanExercise(selectedPlanId, pe.id);
      await loadPlanDetail(selectedPlanId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove exercise');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <CardSection title="Training Plans" gradient="from-orange-500 to-red-600">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          <span className="ml-3 text-slate-600 dark:text-slate-400">Loading plans...</span>
        </div>
      </CardSection>
    );
  }

  return (
    <div className="space-y-6">
      {error && <ErrorAlert error={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Plans list ─────────────────────────────────────────────────────── */}
        <CardSection title="Training Plans" gradient="from-orange-500 to-red-600">
          <div className="space-y-4">
            {/* Create plan toggle */}
            {!showCreateForm ? (
              <Button
                variant="primary"
                onClick={() => setShowCreateForm(true)}
                className="w-full"
              >
                + Create New Plan
              </Button>
            ) : (
              <form onSubmit={handleCreatePlan} className="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div>
                  <label htmlFor="plan-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Plan Name
                  </label>
                  <input
                    id="plan-name"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="form-input w-full"
                    placeholder="e.g. Push Day A"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="plan-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    id="plan-description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="form-input w-full"
                    placeholder="Optional notes about this plan..."
                    rows={2}
                  />
                </div>

                <div>
                  <label htmlFor="plan-type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Plan Type
                  </label>
                  <select
                    id="plan-type"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="form-input w-full"
                  >
                    {PLAN_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {planTypeLabel(t)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button variant="primary" type="submit" disabled={actionLoading || !newName.trim()}>
                    {actionLoading ? 'Creating...' : 'Create Plan'}
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewName('');
                      setNewDescription('');
                      setNewType('custom');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* Plans list */}
            {plans.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
                No training plans yet. Create one to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(selectedPlanId === plan.id ? null : plan.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedPlanId === plan.id
                        ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-900/10 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                    style={{ borderLeftWidth: '4px' }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 dark:text-white truncate">
                            {plan.name}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_TYPE_COLORS[plan.planType] || PLAN_TYPE_COLORS.custom}`}>
                            {planTypeLabel(plan.planType)}
                          </span>
                        </div>
                        {plan.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
                            {plan.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-medium ${
                          plan.isActive
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            plan.isActive ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        />
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardSection>

        {/* ── Plan detail ────────────────────────────────────────────────────── */}
        <CardSection title={selectedPlanDetail ? selectedPlanDetail.name : 'Plan Details'} gradient="from-orange-500 to-red-600">
          {!selectedPlanId ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-12">
              Select a plan to view its exercises.
            </p>
          ) : detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" />
              <span className="ml-3 text-slate-600 dark:text-slate-400">Loading...</span>
            </div>
          ) : selectedPlanDetail ? (
            <div className="space-y-6">
              {/* Plan meta */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${PLAN_TYPE_COLORS[selectedPlanDetail.planType] || PLAN_TYPE_COLORS.custom}`}>
                    {planTypeLabel(selectedPlanDetail.planType)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(selectedPlanDetail)}
                    disabled={actionLoading}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedPlanDetail.isActive
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${selectedPlanDetail.isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
                    {selectedPlanDetail.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
                <Button
                  variant="ghost"
                  onClick={handleDeletePlan}
                  disabled={actionLoading}
                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm"
                >
                  Delete Plan
                </Button>
              </div>

              {selectedPlanDetail.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedPlanDetail.description}
                </p>
              )}

              {/* Exercises list */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Exercises ({selectedPlanDetail.exercises.length})
                </h3>

                {selectedPlanDetail.exercises.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                    No exercises yet. Add one below.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedPlanDetail.exercises
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((pe, idx) => (
                        <div
                          key={pe.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-5 text-center">
                                {idx + 1}
                              </span>
                              <span className="font-medium text-slate-900 dark:text-white text-sm truncate">
                                {pe.exerciseName}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 ml-7 text-xs text-slate-500 dark:text-slate-400">
                              <span>{pe.targetSets} sets</span>
                              <span>{pe.targetReps} reps</span>
                              {pe.targetWeightKg && (
                                <span>{pe.targetWeightKg} kg</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteExercise(pe)}
                            disabled={actionLoading}
                            className="flex-shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                            aria-label={`Remove ${pe.exerciseName}`}
                          >
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Add exercise form */}
              <form onSubmit={handleAddExercise} className="space-y-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Add Exercise
                </h3>

                <div>
                  <label htmlFor="add-exercise-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Exercise
                  </label>
                  <select
                    id="add-exercise-select"
                    value={addExerciseId}
                    onChange={(e) => setAddExerciseId(e.target.value)}
                    className="form-input w-full"
                    required
                  >
                    <option value="">Select exercise...</option>
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="add-target-sets" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Sets
                    </label>
                    <NumberInput
                      id="add-target-sets"
                      value={addTargetSets}
                      onChange={setAddTargetSets}
                      min={1}
                      step={1}
                      ariaLabel="Target sets"
                    />
                  </div>
                  <div>
                    <label htmlFor="add-target-reps" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Reps
                    </label>
                    <NumberInput
                      id="add-target-reps"
                      value={addTargetReps}
                      onChange={setAddTargetReps}
                      min={1}
                      step={1}
                      ariaLabel="Target reps"
                    />
                  </div>
                  <div>
                    <label htmlFor="add-target-weight" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Weight (kg)
                    </label>
                    <NumberInput
                      id="add-target-weight"
                      value={addTargetWeight}
                      onChange={setAddTargetWeight}
                      min={0}
                      step={2.5}
                      placeholder="Optional"
                      ariaLabel="Target weight in kg"
                    />
                  </div>
                </div>

                <Button variant="primary" type="submit" disabled={actionLoading || !addExerciseId} className="w-full">
                  {actionLoading ? 'Adding...' : 'Add to Plan'}
                </Button>
              </form>
            </div>
          ) : null}
        </CardSection>
      </div>
    </div>
  );
}
