import { describe, it, expect, beforeEach } from 'vitest';
import { getStoredTheme, setStoredTheme, prefersDark, applyTheme, resolveInitialTheme } from '../lib/theme';

describe('theme utils', () => {
  beforeEach(() => {
    // reset localStorage
    try { localStorage.clear(); } catch {}
    // reset document classes
    if (typeof document !== 'undefined') {
      document.documentElement.className = '';
    }
  });

  it('stores and retrieves theme', () => {
    setStoredTheme('dark');
    expect(getStoredTheme()).toBe('dark');
    setStoredTheme(null);
    expect(getStoredTheme()).toBeNull();
  });

  it('prefersDark falls back safely', () => {
    // stub matchMedia
    const orig = (globalThis as any).window?.matchMedia;
    (globalThis as any).window = (globalThis as any).window || {};
    (globalThis as any).window.matchMedia = () => ({ matches: true });
    expect(prefersDark()).toBe(true);
    (globalThis as any).window.matchMedia = () => ({ matches: false });
    expect(prefersDark()).toBe(false);
    (globalThis as any).window.matchMedia = orig;
  });

  it('applies theme classes to document element', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    applyTheme('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    applyTheme(null);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('resolves initial theme from storage or system', () => {
    setStoredTheme('light');
    expect(resolveInitialTheme()).toBe('light');
    setStoredTheme(null);
    const orig = (globalThis as any).window?.matchMedia;
    (globalThis as any).window = (globalThis as any).window || {};
    (globalThis as any).window.matchMedia = () => ({ matches: true });
    expect(resolveInitialTheme()).toBe('dark');
    (globalThis as any).window.matchMedia = orig;
  });
});
