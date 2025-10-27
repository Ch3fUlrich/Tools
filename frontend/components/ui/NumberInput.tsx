"use client";

import React from 'react';

interface NumberInputProps {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
  placeholder?: string;
  unit?: string;
  className?: string;
  ariaLabel?: string;
  incrementLabel?: string;
  decrementLabel?: string;
}

export default function NumberInput({ id, value, onChange, step = 1, min = 0, placeholder, unit, className, ariaLabel, incrementLabel, decrementLabel }: NumberInputProps) {
  const stepUp = () => {
    const n = parseFloat(value || '0') + step;
    onChange(String(Number.isInteger(step) ? Math.round(n) : Number(n).toFixed(2)));
  };
  const stepDown = () => {
    const n = Math.max(min, parseFloat(value || '0') - step);
    onChange(String(Number.isInteger(step) ? Math.round(n) : Number(n).toFixed(2)));
  };

  return (
    <div className={`relative number-input`}>
      <input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`form-input ${className || ''}`}
        placeholder={placeholder}
        min={min}
        step={step}
        aria-label={ariaLabel || undefined}
      />

      <div className="stepper-wrap">
  <button type="button" className="number-stepper" onClick={stepUp} aria-label={incrementLabel || 'Increase value'}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 01.707.293l4 4a1 1 0 11-1.414 1.414L10 7.414 6.707 10.707A1 1 0 115.293 9.293l4-4A1 1 0 0110 5z" clipRule="evenodd" />
          </svg>
        </button>
  <button type="button" className="number-stepper" onClick={stepDown} aria-label={decrementLabel || 'Decrease value'}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 15a1 1 0 01-.707-.293l-4-4a1 1 0 111.414-1.414L10 12.586l3.293-3.293a1 1 0 111.414 1.414l-4 4A1 1 0 0110 15z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {unit && <span className="absolute right-20 top-3 text-sm text-gray-500 dark:text-gray-400">{unit}</span>}
    </div>
  );
}
