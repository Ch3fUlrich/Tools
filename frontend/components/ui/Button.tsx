/* global HTMLButtonElement */
"use client";

import React from 'react';

type Variant = 'primary' | 'ghost' | 'success' | 'default';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  success: 'btn-success',
  default: 'inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100',
};

export default function Button({ variant = 'default', className = '', children, ...rest }: Props) {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.default;
  return (
    // Provide a safe default text color as a low-risk fallback; variant classes may override it.
    <button className={`text-gray-900 dark:text-white ${variantClass} ${className}`} {...rest}>
      {children}
    </button>
  );
}
