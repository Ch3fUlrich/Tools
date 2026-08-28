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
        step="any"
        // `type=number` alone still gives some mobile browsers a full QWERTY keyboard;
        // inputmode="decimal" is what actually summons the numeric pad.
        inputMode="decimal"
        enterKeyHint="done"
        aria-label={ariaLabel || undefined}
        // The unit is rendered as a sibling, so screen readers would otherwise never
        // reach it — announce it as the field's description instead.
        aria-describedby={unit && id ? `${id}-unit` : undefined}
      />

      <div className="stepper-wrap">
  <button type="button" className="number-stepper" onClick={stepUp} aria-label={incrementLabel || 'Increase value'}>
          <StepperUpIcon />
        </button>
  <button type="button" className="number-stepper" onClick={stepDown} aria-label={decrementLabel || 'Decrease value'}>
          <StepperDownIcon />
        </button>
      </div>

      {/*
        Positioned inline on purpose: Tailwind v4 does not emit `absolute`/`right-20`/
        `top-3` in this project, so the unit fell out of the wrapper's positioning
        context and rendered as a stray line under the field. `.number-input` is
        `position: relative` (globals.css), so this anchors to the field itself.
      */}
      {unit && (
        <span
          id={id ? `${id}-unit` : undefined}
          className="text-sm"
          style={{
            position: 'absolute',
            right: '3rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted)',
            pointerEvents: 'none',
          }}
        >
          {unit}
        </span>
      )}
    </div>
  );
}
