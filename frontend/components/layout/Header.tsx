"use client";

/* global HTMLDivElement, getComputedStyle, Element, ResizeObserver */
import Link from 'next/link';
import React, { useEffect, useRef } from 'react';
import UserControls from '@/components/layout/UserControls';

export default function Header() {
  const siteRef = useRef<HTMLDivElement | null>(null);
  const leftRef = useRef<HTMLDivElement | null>(null);
  const brandRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function compute() {
      if (!siteRef.current || !navRef.current || !brandRef.current || !rightRef.current) return;
      const containerWidth = siteRef.current.clientWidth;
      const brandW = brandRef.current.offsetWidth || 0;
      const rightW = rightRef.current.offsetWidth || 0;
      const navItems = Array.from(navRef.current.querySelectorAll('.nav-item')) as HTMLElement[];

      // compute gap size from computed style
      const navStyle = getComputedStyle(navRef.current as Element);
      const gapValue = navStyle.gap || navStyle.columnGap || '16px';
      const gapSize = parseFloat(gapValue) || 16;
      const totalGaps = gapSize * Math.max(0, navItems.length - 1);

      // approximate emoji width from first item if available
      let emojiW = 40;
      const firstEmoji = navRef.current.querySelector('.nav-emoji') as HTMLElement | null;
      if (firstEmoji) {
        emojiW = firstEmoji.offsetWidth || emojiW;
      }

      const navExtra = 48; // breathing room
      const totalNeededEmoji = brandW + rightW + totalGaps + navItems.length * emojiW + navExtra;

      // set CSS variable so the media query uses a dynamic threshold
      try {
        document.documentElement.style.setProperty('--collapse-threshold', `${Math.ceil(totalNeededEmoji)}px`);
      } catch {
        // ignore if not allowed
      }

      // Per-button: decide if the label fits in available per-item width
      const availableForNav = containerWidth - brandW - rightW - totalGaps;
      const availablePerItem = navItems.length > 0 ? availableForNav / navItems.length : 0;

      navItems.forEach((item) => {
        const label = item.querySelector('.nav-label') as HTMLElement | null;
        if (!label) return;
        // include emoji width + label + horizontal padding allowance when deciding
        const needed = (label.scrollWidth || 0) + emojiW + 24; // padding allowance
        if (availablePerItem < needed) {
          item.setAttribute('data-collapse', 'true');
        } else {
          item.removeAttribute('data-collapse');
        }
      });
    }

    // initial compute
    compute();

    // re-run compute shortly after mount to let fonts and layout settle
    const t1 = window.setTimeout(compute, 50);
    const t2 = window.setTimeout(compute, 250);

    const ro = new ResizeObserver(() => compute());
    if (siteRef.current) ro.observe(siteRef.current);
    if (navRef.current) ro.observe(navRef.current);
    if (rightRef.current) ro.observe(rightRef.current);
    if (brandRef.current) ro.observe(brandRef.current);

    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', compute);
    };
  }, []);

  return (
    <header className="w-full bg-gradient-to-r from-purple-100/60 via-purple-50/60 to-pink-100/60 dark:from-purple-900/60 dark:via-purple-800/60 dark:to-pink-900/60 backdrop-blur-md border-b border-purple-200/40 dark:border-purple-700/40 animate-fade-in-down">
      <div ref={siteRef} className="header-container flex items-center justify-between gap-4 py-0 h-14">
        <div ref={leftRef} className="flex items-center gap-4 flex-1 min-w-0">
          <Link href="/" className="flex items-center gap-3 no-underline hover:shadow-lg transition-all duration-300 h-full group">
            <div ref={brandRef} className="btn-brand group-hover:rotate-12 transition-transform duration-300" aria-hidden>
              <span className="inline-block text-2xl leading-none align-middle -tracking-tighter">🧰</span>
            </div>
          </Link>

          <nav ref={navRef} className="nav-responsive desktop-only flex-1 items-stretch gap-4 min-w-0 h-full">
            <Link 
              href="/tools/dice" 
              className={`nav-item inline-flex items-center justify-center flex-1 h-full px-4 btn-nav text-sm no-underline group`} 
              aria-label="Dice"
            >
              <span className="nav-emoji group-hover:animate-bounce-subtle transition-transform duration-300">🎲</span>
              <span className="nav-label truncate">Dice</span>
            </Link>
            <Link 
              href="/tools/fat-loss" 
              className={`nav-item inline-flex items-center justify-center flex-1 h-full px-4 btn-nav text-sm no-underline group`} 
              aria-label="Fat"
            >
              <span className="nav-emoji group-hover:animate-bounce-subtle transition-transform duration-300">🏋️</span>
              <span className="nav-label truncate">Fat</span>
            </Link>
            <Link 
              href="/tools/n26" 
              className={`nav-item inline-flex items-center justify-center flex-1 h-full px-4 btn-nav text-sm no-underline group`} 
              aria-label="N26"
            >
              <span className="nav-emoji group-hover:animate-bounce-subtle transition-transform duration-300">🏦</span>
              <span className="nav-label truncate">N26</span>
            </Link>
            <Link 
              href="/tools/bloodlevel" 
              className={`nav-item inline-flex items-center justify-center flex-1 h-full px-4 btn-nav text-sm no-underline group`} 
              aria-label="Blood Level"
            >
              <span className="nav-emoji group-hover:animate-bounce-subtle transition-transform duration-300">🧪</span>
              <span className="nav-label truncate">Blood Level</span>
            </Link>
          </nav>
        </div>

        <div ref={rightRef} className="flex items-center gap-3">
          {/* UserControls handles theme toggle and sign-in/profile swapping on the client */}
          <UserControls />

          {/* Enhanced mobile overflow: dropdown */}
          <div className="mobile-dropdown mobile-only">
            <details className="relative" open={false}>
              <summary
                className="list-none px-3 py-2 rounded-lg hover:bg-purple-100/50 dark:hover:bg-purple-800/50 transition-colors duration-200 cursor-pointer"
                aria-haspopup="true"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </summary>
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-soft-lg border border-slate-200/60 dark:border-slate-700/60 p-2 animate-scale-in">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Tools
                </div>
                <Link 
                  href="/tools/dice" 
                  className={`btn-ghost block w-full text-left px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 no-underline rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/50 transition-colors duration-200`}
                >
                  <span className="mr-3">🎲</span>
                  Dice Roller
                </Link>
                <Link 
                  href="/tools/fat-loss" 
                  className={`btn-ghost block w-full text-left px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 no-underline rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/50 transition-colors duration-200`}
                >
                  <span className="mr-3">🏋️</span>
                  Fat Loss Calculator
                </Link>
                <Link 
                  href="/tools/n26" 
                  className={`btn-ghost block w-full text-left px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 no-underline rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/50 transition-colors duration-200`}
                >
                  <span className="mr-3">🏦</span>
                  N26 Transaction Analyzer
                </Link>
                <Link 
                  href="/tools/bloodlevel" 
                  className={`btn-ghost block w-full text-left px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 no-underline rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/50 transition-colors duration-200`}
                >
                  <span className="mr-3">🧪</span>
                  Blood Level Calculator
                </Link>
                <div className="my-2 border-t border-slate-200 dark:border-slate-700"></div>
                <Link 
                  href="/auth" 
                  className={`btn-ghost block w-full text-left px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 no-underline rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/50 transition-colors duration-200`}
                >
                  <span className="mr-3">🔐</span>
                  Sign In
                </Link>
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}