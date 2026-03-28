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
    <header
      className="w-full backdrop-blur-md animate-fade-in-down"
      style={{
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--header-border)',
        boxShadow: 'var(--header-shadow)',
      }}
    >
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
          <div className="mobile-dropdown mobile-only" style={{position:'relative'}}>
            <details open={false}>
              <summary
                className="list-none rounded-lg transition-colors duration-200 cursor-pointer"
                style={{padding:'0.5rem 0.75rem', display:'block'}}
                aria-haspopup="true"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:20,height:20,color:'var(--fg)'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </summary>
              <div className="popup-panel animate-scale-in" style={{position:'absolute', right:0, top:'calc(100% + 0.5rem)', width:240, padding:'0.5rem', zIndex:100}}>
                <div className="uppercase tracking-wider" style={{padding:'0.5rem 0.75rem', fontSize:'0.75rem', fontWeight:700, color:'var(--muted)'}}>
                  Tools
                </div>
                <Link href="/tools/dice" className="btn-ghost block w-full text-left no-underline rounded-lg transition-colors duration-200" style={{padding:'0.625rem 0.75rem', fontSize:'0.875rem', color:'var(--fg)'}}>
                  <span className="mr-3">🎲</span>Dice Roller
                </Link>
                <Link href="/tools/fat-loss" className="btn-ghost block w-full text-left no-underline rounded-lg transition-colors duration-200" style={{padding:'0.625rem 0.75rem', fontSize:'0.875rem', color:'var(--fg)'}}>
                  <span className="mr-3">🏋️</span>Fat Loss Calculator
                </Link>
                <Link href="/tools/n26" className="btn-ghost block w-full text-left no-underline rounded-lg transition-colors duration-200" style={{padding:'0.625rem 0.75rem', fontSize:'0.875rem', color:'var(--fg)'}}>
                  <span className="mr-3">🏦</span>N26 Transaction Analyzer
                </Link>
                <Link href="/tools/bloodlevel" className="btn-ghost block w-full text-left no-underline rounded-lg transition-colors duration-200" style={{padding:'0.625rem 0.75rem', fontSize:'0.875rem', color:'var(--fg)'}}>
                  <span className="mr-3">🧪</span>Blood Level Calculator
                </Link>
                <div style={{margin:'0.5rem 0', borderTop:'1px solid var(--card-border)'}}></div>
                <Link href="/auth" className="btn-ghost block w-full text-left no-underline rounded-lg transition-colors duration-200" style={{padding:'0.625rem 0.75rem', fontSize:'0.875rem', color:'var(--fg)'}}>
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