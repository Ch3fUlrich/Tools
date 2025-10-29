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
    <>
      <ThemeToggle />

      {/* Right-side controls: when signed in show profile button; otherwise show sign-in */}
      <div className="hidden sm:flex desktop-only items-center gap-3">
        {signedIn ? (
          // Profile avatar button
          <Link href="/profile" className={`btn btn-icon btn-profile rounded-full no-underline`} aria-label="Open profile">
            👤
          </Link>
        ) : (
          <Link href="/auth" className={`btn btn-signin no-underline`}>Sign In</Link>
        )}
      </div>
    </>
  );
}
