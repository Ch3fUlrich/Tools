'use client';

import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultMode?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, onSuccess, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  const handleSwitchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
  };

  // Short-circuit when closed
  if (!isOpen) return null;

  // Theme-aware overlay: fully white in light mode, fully black in dark mode, slight transparency
  const overlay = (
    <div
      className="fixed inset-0 bg-white/80 dark:bg-black/80 bg-gray-500 transition-opacity"
      onClick={onClose}
    />
  );

  // Modal panel content — keep the panel transparent so inner forms render their own card backgrounds
  const panel = (
    <div className="inline-block align-bottom bg-transparent rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
      <div>
        {/* Pass onClose so forms can render the close button inside the card */}
        {mode === 'login' ? (
          <LoginForm onSuccess={handleSuccess} onSwitchMode={handleSwitchMode} onClose={onClose} />
        ) : (
          <RegisterForm onSuccess={handleSuccess} onSwitchMode={handleSwitchMode} onClose={onClose} />
        )}
      </div>
    </div>
  );

  // Return composed modal
  return (
    // Add a page-level text fallback to the modal container so inner forms inherit readable colors
    <div className="fixed inset-0 z-50 overflow-y-auto text-gray-900 dark:text-white">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {overlay}
        {panel}
      </div>
    </div>
  );
}