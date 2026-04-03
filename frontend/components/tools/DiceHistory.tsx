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
}

interface DiceEntry {
  time: string;
  label?: string;
  summary?: { sum?: number } | null;
  details?: RollDetail[];
}

interface DiceHistoryProps {
  entries?: DiceEntry[];
  source?: 'local' | 'server';
}

export const DiceHistory: React.FC<DiceHistoryProps> = ({ entries = [], source = 'local' }) => {
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
        <div className="flex items-center gap-2">
          <DiceIcon className="w-5 h-5" style={{ color: 'var(--accent)' } as React.CSSProperties} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Session History</h3>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{
          background: source === 'server' ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
          color: source === 'server' ? 'var(--success)' : 'var(--muted)',
          border: `1px solid ${source === 'server' ? 'rgba(16,185,129,0.3)' : 'rgba(148,163,184,0.3)'}`,
        }}>
          {source === 'server' ? 'synced' : 'local'}
        </span>
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

                {/* Expanded detail view */}
                {hasDetails && isOpen && (
                  <div className="px-3 pb-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
                    {e.details!.map((roll, ri) => (
                      <div key={ri} className="mt-2">
                        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--muted)' }}>
                          <span>Group {ri + 1}</span>
                          <span>avg {roll.average.toFixed(1)} · min {Math.min(...roll.used)} · max {Math.max(...roll.used)}</span>
                        </div>
                        <div className="font-mono text-xs flex flex-wrap gap-1">
                          {roll.perDie.map((d, di) => (
                            <span key={di} className="px-1.5 py-0.5 rounded text-xs tabular-nums"
                              style={{ background: 'var(--accent)', color: 'white', opacity: 0.85 }}>
                              {d.original.length > 1 ? `${d.original.join('→')}` : d.final}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
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
