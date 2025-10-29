"use client";

import React, { useState, useRef, useEffect } from 'react';
import DieFaceIcon from '@/components/icons/DieFaceIcon';

type Option = { value: string; label: string; sides?: number };

interface DieSelectProps {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export default function DieSelect({ options, value, onChange, className }: DieSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<globalThis.HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: globalThis.Event) {
      if (!ref.current) return;
      const target = e.target as globalThis.Node | null;
      if (target && !ref.current.contains(target as globalThis.Node)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const selected = options.find(o => o.value === value) || options[0];

  return (
    <div className={`relative inline-block text-left text-gray-900 dark:text-white ${className || ''}`} ref={ref}>
      {/* Native select kept for compatibility with tests and progressive enhancement.
          Visually hidden via off-screen positioning but left in the accessibility tree
          so testing-library can query it by role (combobox). */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden'}}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <button type="button" onClick={() => setOpen(!open)} className="form-input inline-flex items-center gap-2">
        <DieFaceIcon sides={selected?.sides || 6} />
        <span className="text-sm">{selected?.label}</span>
        <svg className="ml-2 w-3 h-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 11.187l3.71-3.956a.75.75 0 111.08 1.04l-4.25 4.53a.75.75 0 01-1.08 0l-4.25-4.53a.75.75 0 01.02-1.06z"/></svg>
      </button>

      {open && (
        <div role="listbox" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)' }} className="absolute z-50 mt-1 w-40 rounded shadow-lg border">
          {options.map(opt => (
            <button key={opt.value} role="option" aria-selected={value === opt.value} onClick={() => { onChange(opt.value); setOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
              <DieFaceIcon sides={opt.sides} />
              <span className="text-sm">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
