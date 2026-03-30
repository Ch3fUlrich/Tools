'use client';

import React, { useState } from 'react';
import { getSession, type WorkoutSession, type WorkoutSessionDetail } from '@/lib/api/client';

interface WorkoutHistoryProps {
  sessions: WorkoutSession[];
}

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return '—';
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function WorkoutHistory({ sessions }: WorkoutHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkoutSessionDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggleExpand(session: WorkoutSession) {
    if (expandedId === session.id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(session.id);
    setLoadingId(session.id);
    try {
      const d = await getSession(session.id);
      setDetail(d);
    } catch {
      setDetail(null);
    } finally {
      setLoadingId(null);
    }
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
        No past workouts yet. Complete your first session to see history here.
      </div>
    );
  }

  // Group sets by exerciseId for detail view
  function groupSets(d: WorkoutSessionDetail) {
    const groups: Record<string, { name: string; sets: typeof d.sets }> = {};
    for (const s of d.sets) {
      if (!groups[s.exerciseId]) groups[s.exerciseId] = { name: s.exerciseName, sets: [] };
      groups[s.exerciseId].sets.push(s);
    }
    return Object.values(groups);
  }

  return (
    <div className="space-y-3">
      {sessions.map(session => (
        <div key={session.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            onClick={() => toggleExpand(session)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-slate-900 dark:text-white text-sm truncate">
                  {session.name}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[session.status] ?? STATUS_STYLE.in_progress}`}>
                  {session.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{formatDate(session.startedAt)}</span>
                <span>{formatDuration(session.startedAt, session.completedAt)}</span>
                {session.totalEnergyKcal != null && (
                  <span>{session.totalEnergyKcal.toFixed(1)} kcal</span>
                )}
                {session.totalVolumeKg != null && (
                  <span>{session.totalVolumeKg.toFixed(1)} kg vol</span>
                )}
              </div>
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${expandedId === session.id ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedId === session.id && (
            <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700">
              {loadingId === session.id ? (
                <div className="py-3 text-center text-xs text-slate-500">Loading…</div>
              ) : detail ? (
                <div className="space-y-3 mt-3">
                  {groupSets(detail).map(group => (
                    <div key={group.name}>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{group.name}</p>
                      <div className="space-y-1">
                        {group.sets.map(s => (
                          <div key={s.id} className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                            <span className="w-8 text-slate-400">#{s.setNumber}</span>
                            <span>{s.weightKg} kg × {s.reps}</span>
                            {s.rpe && <span>RPE {s.rpe}</span>}
                            {s.energyKcal != null && <span className="ml-auto">{s.energyKcal.toFixed(2)} kcal</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-3 text-xs text-slate-400">No set data available.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
