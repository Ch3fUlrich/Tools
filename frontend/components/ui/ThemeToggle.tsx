"use client";

/* global MediaQueryList, MediaQueryListEvent */
import React, { useEffect, useState } from 'react';
import { getStoredTheme, setStoredTheme, applyTheme, resolveInitialTheme } from '@/lib/theme';
import { interactivePop } from '@/lib/animations';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (typeof window === 'undefined' ? 'light' : resolveInitialTheme() || 'light'));

  useEffect(() => {
    // Sync theme on mount
    const initial = resolveInitialTheme() || 'light';
    setTheme(initial);
    applyTheme(initial);
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
  }, []);

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
      className={`inline-flex items-center justify-center p-2 rounded-md bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-sm ${interactivePop}`}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
          <path d="M17.293 13.293A8 8 0 116.707 2.707a7 7 0 0010.586 10.586z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 2.03a1 1 0 011.415 0l.708.707a1 1 0 11-1.414 1.414l-.709-.707a1 1 0 010-1.414zM18 9a1 1 0 110 2h-1a1 1 0 110-2h1zM5.464 4.464a1 1 0 010 1.414L4.757 6.586A1 1 0 113.343 5.17l.707-.707a1 1 0 011.414 0zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm6.536-1.464a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM4 9a1 1 0 110 2H3a1 1 0 110-2h1zM5.464 15.536a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414z" />
        </svg>
      )}
    </button>
  );
}
