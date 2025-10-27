'use client';

import Link from 'next/link';
import React from 'react';
import ClientOnly from '@/components/ui/ClientOnly';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { interactivePop } from '@/lib/animations';

export default function Header() {
  return (
    <header className="w-full bg-[color:var(--accent)/10] dark:bg-[color:var(--bg)/0.6] backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
      <div className="site-container flex items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 no-underline hover:shadow-sm transition-shadow">
            <div className="w-10 h-10 bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-hover)] rounded-lg flex items-center justify-center text-white font-bold ring-1 ring-[color:var(--accent)/20] shadow-sm">
              {/* Tools glyph */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 10.3l4 4a2 2 0 11-2.8 2.8l-4-4M9.5 14.5L3 21l-1-6.5L9.5 7l1.2 1.2" />
              </svg>
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Tools</span>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300 mt-0.5">
                <span className="inline-flex items-center gap-1" aria-hidden>
                  {/* Dice icon */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 7h10v10H7z" /></svg>
                  Dice
                </span>
                <span className="inline-flex items-center gap-1" aria-hidden>🏋️ Fat</span>
                <span className="inline-flex items-center gap-1" aria-hidden>🏦 N26</span>
                <span className="inline-flex items-center gap-1" aria-hidden>🧪 Tolerance</span>
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-3">
            <Link href="/tools/dice" className={`px-2 py-1 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition no-underline ${interactivePop}`}>Dice</Link>
            <Link href="/tools/fat-loss" className={`px-2 py-1 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition no-underline ${interactivePop}`}>Fat Loss</Link>
            <Link href="/tools/n26" className={`px-2 py-1 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition no-underline ${interactivePop}`}>N26</Link>
            <Link href="/tools/tolerance" className={`px-2 py-1 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition no-underline ${interactivePop}`}>Tolerance</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ClientOnly fallback={null}>
            <ThemeToggle />
          </ClientOnly>

          <div className="hidden sm:flex items-center gap-3">
            <Link href="/auth" className={`btn-signin px-3 py-2 rounded-md text-sm no-underline ${interactivePop}`}>Sign In</Link>
            <Link href="/profile" className={`px-2 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700 transition-shadow hover:shadow-md no-underline ${interactivePop}`}>👤</Link>
          </div>

          {/* mobile overflow: dropdown placeholder */}
          <div className="md:hidden">
            <details className="relative">
              <summary className="list-none px-2 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">☰</summary>
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-100 dark:border-gray-700 p-2">
                <Link href="/tools/dice" className="block px-2 py-2 text-sm text-gray-700 dark:text-gray-300">Dice</Link>
                <Link href="/tools/fat-loss" className="block px-2 py-2 text-sm text-gray-700 dark:text-gray-300">Fat Loss</Link>
                <Link href="/tools/n26" className="block px-2 py-2 text-sm text-gray-700 dark:text-gray-300">N26</Link>
                <Link href="/tools/tolerance" className="block px-2 py-2 text-sm text-gray-700 dark:text-gray-300">Tolerance</Link>
                <Link href="/auth" className={`block px-2 py-2 text-sm text-gray-700 dark:text-gray-300 btn-signin rounded-md no-underline ${interactivePop}`}>Sign in</Link>
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}
