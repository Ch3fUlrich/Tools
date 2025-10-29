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
    document.title = 'Sign In — 🧰';
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
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <AuthModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onSuccess={handleAuthSuccess}
        defaultMode="login"
      />
    </div>
  );
}

