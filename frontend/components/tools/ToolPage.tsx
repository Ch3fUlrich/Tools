"use client";

import React from 'react';
import { useTranslation } from '@/components/i18n/LanguageProvider';
import type { MessageKey } from '@/lib/i18n/messages';

type Props = {
  title: string;
  /** Catalogue key for the title; wins over `title` when the language changes. */
  titleKey?: MessageKey;
  /** Catalogue key for the description. */
  descriptionKey?: MessageKey;
  description?: string;
  /** Emoji shown inside the gradient icon box, e.g. "🏋️" */
  emoji?: string;
  /** Tailwind gradient start, e.g. "from-blue-500" */
  gradientFrom?: string;
  /** Tailwind gradient end, e.g. "to-cyan-600" */
  gradientTo?: string;
  /** Optional max-width override for tools that need a wider canvas. */
  maxWidthClassName?: string;
  children: React.ReactNode;
};

/**
 * Single source of truth for every tool page layout:
 * - Page background
 * - Outer card container
 * - Tool header (emoji icon + h1 title + description)
 *
 * Tool components rendered as children must NOT add their own <h1>.
 */
export default function ToolPage({
  title,
  titleKey,
  descriptionKey,
  description,
  emoji,
  gradientFrom = 'from-purple-500',
  gradientTo = 'to-pink-600',
  maxWidthClassName = 'max-w-7xl',
  children,
}: Props) {
  const { t } = useTranslation();
  const heading = titleKey ? t(titleKey) : title;
  const subtitle = descriptionKey ? t(descriptionKey) : description;

  return (
    <div className="min-h-screen" style={{background:'var(--bg)'}}>
      <main id="main-content" className={`tool-page-main ${maxWidthClassName} w-fit min-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16`}>
        <div className="tool-page-frame w-fit min-w-full rounded-2xl overflow-hidden animate-fade-in-up" style={{background:'var(--card-bg)',border:'1px solid var(--card-border)',boxShadow:'var(--shadow-soft)'}}>
          {/* Tool header — the only <h1> on the page */}
          <div className="px-6 lg:px-8 pt-8 pb-6 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              {emoji && (
                <div className={`p-3 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-2xl`} style={{boxShadow:'0 8px 32px -8px rgba(124,58,237,0.35)'}}>
                  <span className="text-3xl" role="img" aria-label={heading}>{emoji}</span>
                </div>
              )}
              <h1 className="text-3xl sm:text-4xl font-bold" style={{background:'var(--gradient-primary)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
                {heading}
              </h1>
            </div>
            {subtitle && (
              // maxWidth is set inline on purpose: Tailwind v4 does not always emit
              // `max-w-2xl` here, and without a cap the description's max-content width
              // drives the whole `w-fit` frame — a long description then makes the page
              // wider than the viewport.
              <p className="text-lg max-w-2xl mx-auto" style={{color:'var(--muted)', maxWidth:'42rem'}}>
                {subtitle}
              </p>
            )}
          </div>
          {/* Divider between header and tool content */}
          <div style={{height:'1px', background:'var(--card-border)', margin:'0 1.5rem'}} />

          {/* Tool content */}
          <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
