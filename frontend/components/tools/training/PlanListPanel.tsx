import React, { useState } from 'react';
import CardSection from '@/components/ui/CardSection';
import Button from '@/components/ui/Button';
import { type TrainingPlan } from '@/lib/api/client';
import { PLAN_TYPES, PLAN_TYPE_COLORS, planTypeLabel } from './planUtils';

interface PlanListPanelProps {
  plans: TrainingPlan[];
  selectedPlanId: string | null;
  onSelectPlan: (id: string | null) => void;
  onCreatePlan: (plan: { name: string; description?: string; planType: string }) => Promise<boolean>;
  actionLoading: boolean;
}

export default function PlanListPanel({
  plans,
  selectedPlanId,
  onSelectPlan,
  onCreatePlan,
  actionLoading,
}: PlanListPanelProps) {
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<string>('custom');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const success = await onCreatePlan({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      planType: newType,
    });

    if (success) {
      setNewName('');
      setNewDescription('');
      setNewType('custom');
      setShowCreateForm(false);
    }
  };

  return (
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
          <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
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
                onClick={() => onSelectPlan(selectedPlanId === plan.id ? null : plan.id)}
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
  );
}
