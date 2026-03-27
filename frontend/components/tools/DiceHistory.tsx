import React from 'react';
import DiceIcon from '../icons/DiceIcon';

interface DiceEntry {
  time: string;
  label?: string;
  summary?: { sum?: number } | null;
}

interface DiceHistoryProps {
  entries?: DiceEntry[];
  source?: 'local' | 'server';
}

export const DiceHistory: React.FC<DiceHistoryProps> = ({ entries = [], source = 'local' }) => {
  return (
    <aside className="p-4 bg-white dark:bg-slate-900 rounded-lg shadow-sm text-slate-900 dark:text-white">
      <header className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <DiceIcon className="w-5 h-5 text-indigo-600" />
          <h3 className="text-md font-medium">Session History</h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          source === 'server'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          {source === 'server' ? 'synced' : 'local'}
        </span>
      </header>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No rolls yet this session.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e, idx) => (
            <li key={idx} className="p-2 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex justify-between text-sm">
                <div>{e.label || 'Roll'} <span className="text-xs text-slate-400">{e.time}</span></div>
                <div className="font-medium">{e.summary?.sum ?? '-'}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
};

export default DiceHistory;
