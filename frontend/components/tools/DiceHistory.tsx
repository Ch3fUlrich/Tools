import React from 'react';
import DiceIcon from '../icons/DiceIcon';

interface DiceEntry {
  time: string;
  label?: string;
  summary?: { sum?: number } | null;
}

export const DiceHistory: React.FC<{ entries?: DiceEntry[] }> = ({ entries = [] }) => {
  return (
    <aside className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
      <header className="flex items-center gap-2 mb-3">
        <DiceIcon className="w-5 h-5 text-indigo-600" />
        <h3 className="text-md font-medium">Session History</h3>
      </header>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">No rolls yet this session.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e, idx) => (
            <li key={idx} className="p-2 border rounded hover:bg-gray-50">
              <div className="flex justify-between text-sm">
                <div>{e.label || 'Roll'} <span className="text-xs text-gray-400">{e.time}</span></div>
                <div className="font-medium">{e.summary?.sum ?? '-'}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

export default DiceHistory;
