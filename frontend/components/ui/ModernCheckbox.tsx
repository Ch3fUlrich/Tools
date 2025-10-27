import React from 'react';

type Props = {
  checked?: boolean;
  onChange?: (v: boolean) => void;
  id?: string;
  label?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
};

export default function ModernCheckbox({ checked = false, onChange, id, label, className = '', ariaLabel }: Props) {
  return (
    <label className={`modern-checkbox ${className}`} htmlFor={id}>
      <input id={id} type="checkbox" aria-label={ariaLabel} checked={checked} onChange={(e) => onChange && onChange(e.target.checked)} />
      <span className="box" aria-hidden>
        {checked && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      {label && <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>}
    </label>
  );
}
