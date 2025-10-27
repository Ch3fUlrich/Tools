"use client";

import React from 'react';

interface Item {
  value: string;
  label: React.ReactNode;
}

interface Props {
  items: Item[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
  showCount?: boolean;
}

export default function Dropdown({ items, value, onChange, className = '', showCount = false }: Props) {
  const selected = items.find(i => i.value === value);
  return (
    <div className={`inline-flex items-center ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-input w-auto text-sm"
      >
        {items.map(i => (
          <option key={i.value} value={i.value}>{i.label}</option>
        ))}
      </select>
      {showCount && (
        <div className="ml-2 inline-flex items-center px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          {selected ? selected.value : ''}
        </div>
      )}
    </div>
  );
}
