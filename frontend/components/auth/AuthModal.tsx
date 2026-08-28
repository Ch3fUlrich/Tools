'use client';

import { useState } from 'react';
import { AutheliaButton } from './AutheliaButton';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { useAuthConfig } from './useAuthConfig';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultMode?: 'login' | 'register';
}

/**
 * The whole sign-in card when single sign-on is the only method the backend accepts.
 *
 * Signing in and signing up are the same action here: the identity provider creates the
 * account on first login and the backend provisions the local user from the ID token, so
 * there is nothing for a separate "register" screen to do.
 */
function SsoOnlyPanel({
  providerName,
  onClose,
}: {
  providerName: string;
  onClose: () => void;
}) {
  return (
    <div style={{ padding: '2rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--fg)' }}>
            Sign in
          </h2>
          <p
            style={{
              marginTop: '0.375rem',
              fontSize: '0.9375rem',
              color: 'var(--muted)',
              maxWidth: '26rem',
            }}
          >
            This site uses {providerName} for sign-in. Your account is created automatically
            the first time you sign in — there is nothing separate to register.
          </p>
        </div>
        <button
          onClick={onClose}
          type="button"
          className="btn-icon"
          aria-label="Close sign-in dialog"
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            style={{ width: 18, height: 18, color: 'var(--muted)', flexShrink: 0 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div style={{ marginTop: '1.75rem' }}>
        <AutheliaButton providerName={providerName} variant="primary" />
      </div>
    </div>
  );
}

export function AuthModal({ isOpen, onClose, onSuccess, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const { localAuthEnabled, oidcProviderName } = useAuthConfig();

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
        
        {/* Pass onClose so forms can render the close button inside the card.
            When the backend accepts single sign-on only, the email/password forms are not
            merely hidden — offering them would invite the user to type credentials into a
            form the server answers with 403. */}
        {!localAuthEnabled ? (
          <SsoOnlyPanel providerName={oidcProviderName} onClose={onClose} />
        ) : mode === 'login' ? (
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