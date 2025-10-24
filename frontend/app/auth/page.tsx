'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthModal } from '@/components/auth';

export default function AuthPage() {
  // We only open the modal on this route; the setter is intentionally unused.
  const [isModalOpen] = useState(true);
  const router = useRouter();

  const handleAuthSuccess = () => {
    router.push('/');
  };

  const handleClose = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <AuthModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onSuccess={handleAuthSuccess}
        defaultMode="login"
      />
    </div>
  );
}