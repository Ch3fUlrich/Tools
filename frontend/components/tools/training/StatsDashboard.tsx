'use client';

import React, { useState, useEffect, useCallback } from 'react';
import CardSection from '@/components/ui/CardSection';
import ErrorAlert from '@/components/ui/ErrorAlert';
import {
  statsEnergy, statsVolume, statsMuscleEnergy, listSessions,
  type EnergyStatsPoint, type VolumeStatsPoint, type MuscleEnergyData, type WorkoutSession,
} from '@/lib/api/client';
import BodyMuscleMap from './BodyMuscleMap';
import WorkoutHistory from './WorkoutHistory';

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Simple bar chart using div elements
function BarChart({ data, valueKey, label, color }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Array<any>;
  valueKey: string;
  label: string;
  color: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">No data for this period.</p>;
  }
  const values = data.map(d => Number(d[valueKey]) || 0);
  const max = Math.max(...values, 1);
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{label}</p>
      <div className="flex items-end gap-1 h-32 overflow-x-auto pb-1">
        {data.map((d, i) => {
          const val = values[i];
          const height = Math.max(4, (val / max) * 112);
          const dateStr = String(d.date ?? '').slice(5); // MM-DD
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: 28 }}>
              <div
                className="rounded-t-sm w-5 transition-all"
                style={{ height, background: color }}
                title={`${dateStr}: ${val.toFixed(1)}`}
              />
              <span className="text-xs text-slate-400" style={{ fontSize: 9, writingMode: 'vertical-rl' }}>
                {dateStr}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StatsDashboard() {
  const [dateFrom, setDateFrom] = useState(defaultFrom());
  const [dateTo, setDateTo] = useState(todayStr());
  const [energyData, setEnergyData] = useState<EnergyStatsPoint[]>([]);
  const [volumeData, setVolumeData] = useState<VolumeStatsPoint[]>([]);
  const [muscleData, setMuscleData] = useState<MuscleEnergyData[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [normalizeBySize, setNormalizeBySize] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = { from: dateFrom, to: dateTo };
      const [eRes, vRes, mRes, sRes] = await Promise.all([
        statsEnergy(filters),
        statsVolume(filters),
        statsMuscleEnergy(filters),
        listSessions({ from: dateFrom, to: dateTo }),
      ]);
      setEnergyData(eRes.data);
      setVolumeData(vRes.data);
      setMuscleData(mRes.data);
      setSessions(sRes.sessions.filter(s => s.status === 'completed'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  // Summary stats
  const totalSessions = sessions.length;
  const totalEnergy = sessions.reduce((s, x) => s + (x.totalEnergyKcal ?? 0), 0);
  const totalVolume = sessions.reduce((s, x) => s + (x.totalVolumeKg ?? 0), 0);
  const avgEnergy = totalSessions > 0 ? totalEnergy / totalSessions : 0;

  return (
    <div className="space-y-6">
      {error && <ErrorAlert error={error} />}

      {/* Date range */}
      <CardSection title="Filter" gradient="from-orange-500 to-red-600" delay="0ms">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">From</label>
            <input
              type="date" className="form-input text-sm"
              value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">To</label>
            <input
              type="date" className="form-input text-sm"
              value={dateTo} onChange={e => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </CardSection>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Sessions', value: totalSessions, unit: '' },
              { label: 'Energy', value: totalEnergy.toFixed(0), unit: 'kcal' },
              { label: 'Volume', value: totalVolume.toFixed(0), unit: 'kg' },
              { label: 'Avg / Session', value: avgEnergy.toFixed(0), unit: 'kcal' },
            ].map(card => (
              <div key={card.label} className="card text-center py-4">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{card.label}{card.unit ? ` (${card.unit})` : ''}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <CardSection title="Energy Over Time" gradient="from-orange-500 to-red-600" delay="100ms">
            <BarChart data={energyData} valueKey="energyKcal" label="kcal per session" color="#f97316" />
          </CardSection>

          <CardSection title="Volume Over Time" gradient="from-orange-500 to-red-600" delay="150ms">
            <BarChart data={volumeData} valueKey="volumeKg" label="kg per session" color="#dc2626" />
          </CardSection>

          {/* Muscle map */}
          <CardSection title="Muscle Energy Heat Map" gradient="from-orange-500 to-red-600" delay="200ms">
            <BodyMuscleMap
              data={muscleData}
              normalizeBySize={normalizeBySize}
              onToggleNormalize={() => setNormalizeBySize(n => !n)}
            />
          </CardSection>

          {/* Workout history */}
          <CardSection title="Workout History" gradient="from-orange-500 to-red-600" delay="250ms">
            <WorkoutHistory sessions={sessions} />
          </CardSection>
        </>
      )}
    </div>
  );
}
