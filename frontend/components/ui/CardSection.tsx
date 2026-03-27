"use client";

import React from 'react';

interface Props {
  title: string;
  /** Tailwind gradient pair, e.g. "from-blue-500 to-indigo-600" */
  gradient: string;
  children: React.ReactNode;
  /** Extra classes applied to the outer card div (e.g. animation classes) */
  className?: string;
  /** Inline animation delay, e.g. "100ms" */
  delay?: string;
}

/**
 * A self-contained card section with a colored vertical bar and heading.
 * Single source of truth for the "colored bar + title + content" pattern
 * used across all tool components.
 */
export default function CardSection({ title, gradient, children, className = '', delay }: Props) {
  return (
    <div
      className={`card animate-fade-in-up ${className}`}
      style={delay ? { animationDelay: delay } : undefined}
    >
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
        <div className={`w-1 h-8 bg-gradient-to-b ${gradient} rounded-full flex-shrink-0`} aria-hidden="true" />
        {title}
      </h2>
      {children}
    </div>
  );
}
