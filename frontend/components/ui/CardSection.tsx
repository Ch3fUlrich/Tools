"use client";

import React from 'react';
import ResizableCardSection, { type CardSizePreset } from '@/components/ui/ResizableCardSection';

const defaultPresets: CardSizePreset[] = [
  { label: 'Compact', width: 640, height: 420 },
  { label: 'Default' },
  { label: 'Expanded', width: 1120, height: 760 },
];

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
    <ResizableCardSection
      title={title}
      gradient={gradient}
      presets={defaultPresets}
      className={className}
      delay={delay}
    >
      {children}
    </ResizableCardSection>
  );
}
