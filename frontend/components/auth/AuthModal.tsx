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

  // Enhanced theme-aware overlay
  const overlay = (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
      onClick={onClose}
    />
  );

  // Enhanced modal panel with glassmorphism effect
  const panel = (
    <div className="inline-block align-middle bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl text-left overflow-hidden shadow-soft-lg transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-slate-200/60 dark:border-slate-700/60 animate-scale-in">
      <div className="relative">
        {/* Decorative gradient header */}
        <div className="h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500"></div>
        
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        {overlay}
        {panel}
      </div>
    </div>
  );
}