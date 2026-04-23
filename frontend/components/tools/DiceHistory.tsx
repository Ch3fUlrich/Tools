import React, { useState } from 'react';
import DiceIcon from '../icons/DiceIcon';

interface PerDie {
  original: number[];
  final: number;
}

interface RollDetail {
  sum: number;
  average: number;
  perDie: PerDie[];
  used: number[];
  rerollCount?: number;
  rerollConfig?: string;
}

interface DiceEntry {
  time: string;
  label?: string;
  summary?: { sum?: number } | null;
  details?: RollDetail[];
  groupLabels?: string[];
  groupNormProbs?: (number | null)[];
  groupActualProbs?: (number | null)[];
}

interface DiceHistoryProps {
  entries?: DiceEntry[];
  source?: 'local' | 'server';
  onReset?: () => void;
}

export const DiceHistory: React.FC<DiceHistoryProps> = ({ entries = [], source = 'local', onReset }) => {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (idx: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <aside className="rounded-lg p-4" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
      <header className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-6">
          <DiceIcon className="w-5 h-5" style={{ color: 'var(--accent)' } as React.CSSProperties} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Roll History</h3>
        </div>
        <div className="flex items-center" style={{ gap: '0.5rem' }}>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{
            background: source === 'server' ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
            color: source === 'server' ? 'var(--success)' : 'var(--muted)',
            border: `1px solid ${source === 'server' ? 'rgba(16,185,129,0.3)' : 'rgba(148,163,184,0.3)'}`,
          }}>
            {source === 'server' ? 'synced' : 'local'}
          </span>
          {onReset && entries.length > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs px-2 py-0.5 rounded"
              style={{
                background: 'rgba(239,68,68,0.12)',
                color: 'var(--error)',
                border: '1px solid rgba(239,68,68,0.25)',
                cursor: 'pointer',
              }}
              aria-label="Clear history"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {entries.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>No rolls yet this session.</p>
      ) : (
        <ul className="space-y-1">
          {entries.map((e, idx) => {
            const hasDetails = Array.isArray(e.details) && e.details.length > 0;
            const isOpen = expanded.has(idx);
            return (
              <li key={idx} className="rounded-lg" style={{ border: '1px solid var(--card-border)' }}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 flex justify-between items-center transition-colors"
                  style={{ color: 'var(--fg)', background: 'transparent' }}
                  onClick={() => hasDetails && toggle(idx)}
                  aria-expanded={hasDetails ? isOpen : undefined}
                >
                  <span className="flex items-center gap-2">
                    {hasDetails && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ color: 'var(--muted)', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                        <path d="M3 2l4 3-4 3V2z" />
                      </svg>
                    )}
                    <span className="text-sm">{e.label || 'Roll'}</span>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{e.time}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
                    {e.summary?.sum ?? '-'}
                  </span>
                </button>

                {/* Expanded detail view — same table format as Dice Results */}
                {hasDetails && isOpen && (
                  <div className="px-3 pb-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                            <th className="text-left py-1.5 pr-3 text-xs font-medium" style={{ color: 'var(--muted)', width: '15%' }}>Die</th>
                            <th className="text-left py-1.5 pr-3 text-xs font-medium" style={{ color: 'var(--muted)' }}>Values</th>
                            <th className="text-right py-1.5 pr-3 text-xs font-medium" style={{ color: 'var(--muted)', width: '7%' }}>Avg</th>
                            <th className="text-right py-1.5 pr-3 text-xs font-medium" style={{ color: 'var(--muted)', width: '7%' }}>Min</th>
                            <th className="text-right py-1.5 pr-3 text-xs font-medium" style={{ color: 'var(--muted)', width: '7%' }}>Max</th>
                            <th className="text-right py-1.5 pr-3 text-xs font-medium" style={{ color: 'var(--muted)', width: '8%' }}>Actual</th>
                            <th className="text-right py-1.5 pr-3 text-xs font-medium" style={{ color: 'var(--muted)', width: '8%' }}>Norm</th>
                            <th className="text-right py-1.5 pr-3 text-xs font-medium" style={{ color: 'var(--muted)', width: '10%' }}>Reroll</th>
                            <th className="text-right py-1.5 text-xs font-medium" style={{ color: 'var(--muted)', width: '8%' }}>Sum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {e.details!.map((roll, ri) => {
                            const groupLabel = e.groupLabels?.[ri] ?? `Group ${ri + 1}`;
                            const actualProb = e.groupActualProbs?.[ri] ?? null;
                            const normProb = e.groupNormProbs?.[ri] ?? null;
                            const hasValues = roll.used.length > 0;
                            return (
                              <tr key={ri} style={{ borderTop: ri > 0 ? '2px solid var(--accent)' : undefined, borderBottom: '1px solid var(--card-border)' }}>
                                <td className="py-2 pr-3">
                                  <span className="inline-flex items-center justify-center text-xs font-semibold rounded px-1.5 py-0.5"
                                    style={{ background: 'var(--accent)', color: 'white' }}>{groupLabel}</span>
                                </td>
                                <td className="py-2 pr-3 font-mono">
                                  <div className="flex flex-wrap gap-1">
                                    {roll.perDie.map((d, di) => (
                                      <span key={di} className="px-1.5 py-0.5 rounded text-xs tabular-nums"
                                        style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--fg)', border: '1px solid var(--card-border)' }}>
                                        {d.original.length > 1 ? d.original.join(' → ') : d.final}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-2 pr-3 text-right tabular-nums text-xs" style={{ color: 'var(--muted)' }}>
                                  {hasValues ? roll.average.toFixed(1) : '-'}
                                </td>
                                <td className="py-2 pr-3 text-right tabular-nums text-xs" style={{ color: 'var(--muted)' }}>
                                  {hasValues ? Math.min(...roll.used) : '-'}
                                </td>
                                <td className="py-2 pr-3 text-right tabular-nums text-xs" style={{ color: 'var(--muted)' }}>
                                  {hasValues ? Math.max(...roll.used) : '-'}
                                </td>
                                <td className="py-2 pr-3 text-right tabular-nums text-xs" style={{ color: 'var(--muted)' }}>
                                  {actualProb !== null ? `${(actualProb * 100).toFixed(1)}%` : '-'}
                                </td>
                                <td className="py-2 pr-3 text-right tabular-nums text-xs" style={{ color: 'var(--muted)' }}>
                                  {normProb !== null ? `${(normProb * 100).toFixed(0)}%` : '-'}
                                </td>
                                <td className="py-2 pr-3 text-right tabular-nums text-xs" style={{ color: 'var(--muted)' }}>
                                  {roll.rerollConfig ? (
                                    <span>{roll.rerollConfig} <span style={{ color: 'var(--accent)' }}>({roll.rerollCount ?? 0}×)</span></span>
                                  ) : '—'}
                                </td>
                                <td className="py-2 text-right font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
                                  {roll.sum}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
};

export default DiceHistory;
