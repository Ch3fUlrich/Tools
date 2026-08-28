"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LANGUAGE,
  applyLanguage,
  resolveInitialLanguage,
  setStoredLanguage,
  type Language,
} from '@/lib/i18n';
import { MESSAGES, type MessageKey } from '@/lib/i18n/messages';

type Vars = Record<string, string | number>;

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: MessageKey, vars?: Vars) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** Walks a dotted key such as `eg.household` through the catalogue. */
function lookup(language: Language, key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), MESSAGES[language]);
  return typeof value === 'string' ? value : undefined;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Start at the default so the first client render matches the pre-rendered HTML;
  // the real preference is read on mount, exactly as ThemeToggle does for the theme.
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const initial = resolveInitialLanguage();
    setLanguageState(initial);
    applyLanguage(initial);
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    setStoredLanguage(next);
    applyLanguage(next);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, vars) => {
        // Fall back to English rather than showing a raw key if a string is missing.
        const message = lookup(language, key) ?? lookup(DEFAULT_LANGUAGE, key) ?? key;
        return interpolate(message, vars);
      },
    }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/**
 * Components outside the provider (isolated unit tests, Storybook) still render —
 * they just get English.
 */
export function useTranslation(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (context) return context;
  return {
    language: DEFAULT_LANGUAGE,
    setLanguage: () => {},
    t: (key, vars) => interpolate(lookup(DEFAULT_LANGUAGE, key) ?? key, vars),
  };
}
