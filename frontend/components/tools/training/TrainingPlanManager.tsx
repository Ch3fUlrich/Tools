'use client';

import React, { useState, useEffect, useCallback } from 'react';
import CardSection from '@/components/ui/CardSection';
import ErrorAlert from '@/components/ui/ErrorAlert';
import {
  listPlans,
  createPlan,
  getPlan,
  updatePlan,
  deletePlan,
  addPlanExercise,
  deletePlanExercise,
  type TrainingPlan,
  type TrainingPlanDetail,
  type PlanExercise,
  type Exercise,
  listExercises,
} from '@/lib/api/client';

import PlanListPanel from './PlanListPanel';
import PlanDetailPanel from './PlanDetailPanel';

export default function TrainingPlanManager() {
  // ─── State ──────────────────────────────────────────────────────────────────
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<TrainingPlanDetail | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);

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

  const handleCreatePlan = async (plan: { name: string; description?: string; planType: string }) => {
    setActionLoading(true);
    setError(null);
    try {
      await createPlan({
        name: plan.name,
        description: plan.description,
        planType: plan.planType,
      });
      await loadPlans();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (plan: TrainingPlan | TrainingPlanDetail) => {
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

  const handleAddExercise = async (ex: { exerciseId: string; targetSets: number; targetReps: number; targetWeightKg?: number }) => {
    if (!selectedPlanId) return false;
    setActionLoading(true);
    setError(null);
    try {
      await addPlanExercise(selectedPlanId, ex);
      await loadPlanDetail(selectedPlanId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add exercise');
      return false;
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
        <PlanListPanel
          plans={plans}
          selectedPlanId={selectedPlanId}
          onSelectPlan={setSelectedPlanId}
          onCreatePlan={handleCreatePlan}
          actionLoading={actionLoading}
        />

        <PlanDetailPanel
          selectedPlanId={selectedPlanId}
          selectedPlanDetail={selectedPlanDetail}
          detailLoading={detailLoading}
          exercises={exercises}
          actionLoading={actionLoading}
          onToggleActive={handleToggleActive}
          onDeletePlan={handleDeletePlan}
          onAddExercise={handleAddExercise}
          onDeleteExercise={handleDeleteExercise}
        />
      </div>
    </div>
  );
}
