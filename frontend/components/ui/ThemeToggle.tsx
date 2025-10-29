"use client";

/* global MediaQueryList, MediaQueryListEvent */
import React, { useEffect, useState } from 'react';
import { getStoredTheme, setStoredTheme, applyTheme, resolveInitialTheme } from '@/lib/theme';
import MoonIcon from '@/components/icons/MoonIcon';
import SunIcon from '@/components/icons/SunIcon';

export default function ThemeToggle() {
  // Start with a stable value that matches server-rendered HTML to avoid hydration
  // mismatches. We'll read the real preference on mount and update.
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Sync theme on mount — resolveInitialTheme may read localStorage / prefers-color-scheme
    // so we run it only on the client inside useEffect. We update state only if it differs
    // from the server-initialized 'light' to avoid hydration mismatches.
    const initial = resolveInitialTheme() || 'light';
    if (initial !== theme) {
      setTheme(initial);
      applyTheme(initial);
    } else {
      // still apply theme to ensure document state matches
      applyTheme(initial);
    }
    // listen to system changes only when user hasn't explicitly set a preference
    let mq: MediaQueryList | null = null;
    let listener: ((e: MediaQueryListEvent) => void) | null = null;
    if (!getStoredTheme() && typeof window !== 'undefined' && window.matchMedia) {
      mq = window.matchMedia('(prefers-color-scheme: dark)');
      listener = (e: MediaQueryListEvent) => {
        const t = e.matches ? 'dark' : 'light';
        setTheme(t);
        applyTheme(t);
      };
      try { mq.addEventListener('change', listener); } catch { mq.addListener(listener); }
    }
    return () => { if (mq && listener) { try { mq.removeEventListener('change', listener); } catch { try { mq.removeListener(listener); } catch { /* ignore */ } } } };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    setStoredTheme(next);
  }

  return (
    <button
      aria-pressed={theme === 'dark'}
      aria-label="Toggle color theme"
  onClick={toggle}
  className={`btn-nav btn-icon shadow-sm leading-none`}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <MoonIcon className="h-5 w-5 block" style={{ color: '#eab308' }} />
      ) : (
        // Modern minimal sun icon for light mode
        <SunIcon className="h-5 w-5 block" style={{ color: '#f59e0b' }} />
      )}
    </button>
  );
}
