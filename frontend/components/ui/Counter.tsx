"use client";

import React from 'react';
import NumberInput from './NumberInput';

interface Props {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  className?: string;
}

export default function Counter({ value, min = 0, max = 100, onChange, className = '' }: Props) {
  return (
    <div className={`inline-flex items-center text-gray-900 dark:text-white ${className}`}>
      <NumberInput
        ariaLabel="count"
        incrementLabel="increment"
        decrementLabel="decrement"
        value={String(value)}
        onChange={(v) => {
          const parsed = parseInt(v || '0', 10);
          const n = Number.isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed));
          onChange(n);
        }}
        step={1}
        min={min}
        className="form-input--compact"
      />
    </div>
  );
}
