"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthModal } from '@/components/auth';

export default function AuthPage() {
  // We only open the modal on this route; the setter is intentionally unused.
  const [isModalOpen] = useState(true);
  const router = useRouter();

  // set title when component mounts
  useEffect(() => {
    document.title = 'Sign In — Tools Collection';
  }, []);

  const handleAuthSuccess = () => {
    router.push('/');
  };

  const handleClose = () => {
    // go back to previous page (if any) instead of always navigating to the main page
    // In tests the router may be a partial mocked object without `back`, so fall back to push.
    // Avoid `any` by declaring a small widening type that may include `back`.
    type RouterWithOptionalBack = { back?: () => void; push: (url: string) => void };
    const r = router as unknown as RouterWithOptionalBack;
    if (typeof r.back === 'function') {
      r.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-soft-lg">
            <span className="text-4xl">🔐</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-2">
            Welcome Back
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Sign in to access your personalized tools collection
          </p>
        </div>

        <div className="animate-scale-in" style={{ animationDelay: '200ms' }}>
          <AuthModal
            isOpen={isModalOpen}
            onClose={handleClose}
            onSuccess={handleAuthSuccess}
            defaultMode="login"
          />
        </div>

        {/* Additional info */}
        <div className="mt-8 text-center animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            By signing in, you agree to our{' '}
            <a href="#" className="text-accent hover:text-accent-hover font-medium transition-colors duration-200">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-accent hover:text-accent-hover font-medium transition-colors duration-200">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}