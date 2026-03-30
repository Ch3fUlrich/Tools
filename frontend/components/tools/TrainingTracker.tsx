'use client';

import React, { useState } from 'react';
import { ProtectedRoute } from '@/components/auth';
import ActiveWorkout from './training/ActiveWorkout';
import TrainingPlanManager from './training/TrainingPlanManager';
import ExerciseCatalog from './training/ExerciseCatalog';
import BodyMeasurementsPanel from './training/BodyMeasurementsPanel';
import StatsDashboard from './training/StatsDashboard';

const TABS = ['Workout', 'Plans', 'Exercises', 'Body', 'Stats'] as const;
type Tab = (typeof TABS)[number];

export default function TrainingTracker() {
  const [activeTab, setActiveTab] = useState<Tab>('Workout');

  return (
    <ProtectedRoute>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Tab bar */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              style={
                activeTab === tab
                  ? { background: 'linear-gradient(135deg, #f97316, #dc2626)' }
                  : {}
              }
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'Workout' && <ActiveWorkout />}
        {activeTab === 'Plans' && <TrainingPlanManager />}
        {activeTab === 'Exercises' && <ExerciseCatalog />}
        {activeTab === 'Body' && <BodyMeasurementsPanel />}
        {activeTab === 'Stats' && <StatsDashboard />}
      </div>
    </ProtectedRoute>
  );
}
