"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';

// Small client-side helper to detect a signed-in user.
// Assumptions: The app should wire a real auth detection here. As a pragmatic
// default we check for a localStorage key `signedIn=true` or for common
// session cookie names. This is intentionally simple and can be replaced with
// your real auth check (e.g., calling /api/auth/me or using next-auth).
function hasSessionCookie() {
  if (typeof document === 'undefined') return false;
  const cookies = document.cookie || '';
  return /next-auth.session-token|session|__session/.test(cookies);
}

export default function UserControls() {
  const [signedIn, setSignedIn] = useState<boolean>(false);

  useEffect(() => {
    // check a couple of local heuristics
    try {
      const ls = typeof window !== 'undefined' ? window.localStorage.getItem('signedIn') : null;
      if (ls === 'true') {
        setSignedIn(true);
        return;
      }
    } catch { /* ignore */ }

    if (hasSessionCookie()) {
      setSignedIn(true);
      return;
    }

    // default: not signed in
    setSignedIn(false);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />

      {/* Right-side controls: when signed in show profile button; otherwise show sign-in */}
      <div className="hidden sm:flex desktop-only items-center gap-3">
        {signedIn ? (
          // Enhanced Profile avatar button
          <Link 
            href="/profile" 
            className={`btn-profile group relative no-underline hover:scale-105 transition-transform duration-200`} 
            aria-label="Open profile"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">👤</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></div>
          </Link>
        ) : (
          <Link 
            href="/auth" 
            className={`btn-signin group relative no-underline overflow-hidden`}
          >
            <div className="relative z-10 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4 4m-4-4v4m12 0h.01M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Sign In
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </Link>
        )}
      </div>
    </div>
  );
}