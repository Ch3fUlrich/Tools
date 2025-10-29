"use client";

import React from 'react';
import StepperUpIcon from '@/components/icons/StepperUpIcon';
import StepperDownIcon from '@/components/icons/StepperDownIcon';

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
    <div className={`relative number-input text-gray-900 dark:text-white`}>
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
          <StepperUpIcon />
        </button>
  <button type="button" className="number-stepper" onClick={stepDown} aria-label={decrementLabel || 'Decrease value'}>
          <StepperDownIcon />
        </button>
      </div>

      {unit && <span className="absolute right-20 top-3 text-sm text-gray-500 dark:text-gray-400">{unit}</span>}
    </div>
  );
}
