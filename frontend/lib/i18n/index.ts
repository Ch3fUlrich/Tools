/* global navigator */
// Client-side language helpers, mirroring lib/theme.ts.
//
// The site is a static export, so every page is pre-rendered once. Rendering a
// second localized copy per route would double the output and break the flat
// `tools/<name>.html` layout the deployment relies on, so language is applied on
// the client instead and persisted in localStorage.

export type Language = 'en' | 'de';

export const LANGUAGES: Language[] = ['en', 'de'];

export const LANGUAGE_STORAGE_KEY = 'tools-language';

/** Server render and first paint always use this, so hydration stays stable. */
export const DEFAULT_LANGUAGE: Language = 'en';

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'de';
}

export function getStoredLanguage(): Language | null {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function setStoredLanguage(value: Language | null) {
  try {
    if (value === null) {
      localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    } else {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
    }
  } catch {
    // Storage can be unavailable (private mode, blocked cookies) — not fatal.
  }
}

/** Falls back to the browser's own preference before the default. */
export function detectBrowserLanguage(): Language {
  try {
    const candidates = [
      ...(navigator.languages ?? []),
      navigator.language,
    ].filter(Boolean);
    for (const tag of candidates) {
      if (String(tag).toLowerCase().startsWith('de')) return 'de';
      if (String(tag).toLowerCase().startsWith('en')) return 'en';
    }
  } catch {
    // navigator is unavailable during SSR.
  }
  return DEFAULT_LANGUAGE;
}

export function resolveInitialLanguage(): Language {
  return getStoredLanguage() ?? detectBrowserLanguage();
}

/** Keeps <html lang> honest for screen readers and browser translation prompts. */
export function applyLanguage(language: Language) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
}
