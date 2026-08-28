"use client";

import React from 'react';
import { useTranslation } from '@/components/i18n/LanguageProvider';
import { LANGUAGES, type Language } from '@/lib/i18n';

const LABELS: Record<Language, string> = { en: 'EN', de: 'DE' };

/**
 * Two-state language switch, sitting next to the theme toggle in the header.
 * Rendered as a radio group so screen readers announce it as one control with a
 * current selection rather than two unrelated buttons.
 */
export default function LanguageToggle() {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div
      role="radiogroup"
      aria-label={t('common.language')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.125rem',
        padding: '0.1875rem',
        borderRadius: '0.5rem',
        border: '1px solid var(--card-border)',
        background: 'var(--input-bg)',
      }}
    >
      {LANGUAGES.map((code) => {
        const active = language === code;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={code === 'de' ? t('common.switchToGerman') : t('common.switchToEnglish')}
            onClick={() => setLanguage(code)}
            style={{
              minWidth: '2rem',
              padding: '0.25rem 0.4rem',
              border: 0,
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              background: active ? 'var(--gradient-primary)' : 'transparent',
              color: active ? '#fff' : 'var(--fg-secondary)',
              transition: 'background 0.2s ease, color 0.2s ease',
            }}
          >
            {LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
