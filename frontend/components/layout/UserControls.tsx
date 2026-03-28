"use client";

import React from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useAuth } from '@/components/auth/AuthContext';

export default function UserControls() {
  const { isAuthenticated, user, isLoading } = useAuth();

  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />

      {/* Right-side controls: when signed in show profile button; otherwise show sign-in */}
      <div className="hidden sm:flex desktop-only items-center gap-3">
        {isLoading ? null : isAuthenticated ? (
          // Enhanced Profile avatar button
          <Link
            href="/auth"
            className={`btn-profile group relative no-underline hover:scale-105 transition-transform duration-200`}
            aria-label="Open profile"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.email?.[0]?.toUpperCase() || '👤'}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></div>
          </Link>
        ) : (
          <Link
            href="/auth"
            className={`btn-signin group relative no-underline overflow-hidden whitespace-nowrap shrink-0`}
          >
            <div className="relative z-10 flex items-center gap-1.5">
              {/* Login door icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              <span>Sign In</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </Link>
        )}
      </div>
    </div>
  );
}
