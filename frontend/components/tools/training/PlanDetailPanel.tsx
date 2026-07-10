import React, { useState } from 'react';
import CardSection from '@/components/ui/CardSection';
import Button from '@/components/ui/Button';
import NumberInput from '@/components/ui/NumberInput';
import { type TrainingPlanDetail, type PlanExercise, type Exercise } from '@/lib/api/client';
import { PLAN_TYPE_COLORS, planTypeLabel } from './planUtils';

interface PlanDetailPanelProps {
  selectedPlanId: string | null;
  selectedPlanDetail: TrainingPlanDetail | null;
  detailLoading: boolean;
  exercises: Exercise[];
  actionLoading: boolean;
  onToggleActive: (plan: TrainingPlanDetail) => void;
  onDeletePlan: () => void;
  onAddExercise: (ex: { exerciseId: string; targetSets: number; targetReps: number; targetWeightKg?: number }) => Promise<boolean>;
  onDeleteExercise: (pe: PlanExercise) => void;
}

export default function PlanDetailPanel({
  selectedPlanId,
  selectedPlanDetail,
  detailLoading,
  exercises,
  actionLoading,
  onToggleActive,
  onDeletePlan,
  onAddExercise,
  onDeleteExercise,
}: PlanDetailPanelProps) {
  const [addExerciseId, setAddExerciseId] = useState('');
  const [addTargetSets, setAddTargetSets] = useState('3');
  const [addTargetReps, setAddTargetReps] = useState('10');
  const [addTargetWeight, setAddTargetWeight] = useState('');

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !addExerciseId) return;

    const success = await onAddExercise({
      exerciseId: addExerciseId,
      targetSets: parseInt(addTargetSets, 10) || 3,
      targetReps: parseInt(addTargetReps, 10) || 10,
      targetWeightKg: addTargetWeight ? parseFloat(addTargetWeight) : undefined,
    });

    if (success) {
      setAddExerciseId('');
      setAddTargetSets('3');
      setAddTargetReps('10');
      setAddTargetWeight('');
    }
  };

  return (
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
                onClick={() => onToggleActive(selectedPlanDetail)}
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
              onClick={onDeletePlan}
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
                        onClick={() => onDeleteExercise(pe)}
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
          <form onSubmit={handleAddSubmit} className="space-y-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
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
  );
}
