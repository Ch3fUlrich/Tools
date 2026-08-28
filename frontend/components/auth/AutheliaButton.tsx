'use client';

import { startOIDCLogin } from '@/lib/api/client';

interface AutheliaButtonProps {
  /** Provider name to show, from `/api/auth/config`. Defaults to Authelia. */
  providerName?: string;
  /** `primary` when this is the only way in, `ghost` when it sits beside a password form. */
  variant?: 'primary' | 'ghost';
  className?: string;
}

/**
 * Single sign-on button.
 *
 * This used to be labelled "Continue with Google" with a Google logo, which was simply
 * wrong: `/api/auth/oidc/start` has always redirected to whichever OIDC issuer the backend
 * is configured with, and that is Authelia. The label now comes from the backend so it
 * cannot drift from the provider again.
 *
 * "Continue with" rather than "Sign in with": the password form's own button is labelled
 * "Sign In", and two buttons whose accessible names share a prefix are ambiguous to screen
 * readers and to anything else selecting by name.
 */
export function AutheliaButton({
  providerName = 'Authelia',
  variant = 'primary',
  className = '',
}: AutheliaButtonProps) {
  return (
    <button
      onClick={() => startOIDCLogin()}
      type="button"
      className={`${variant === 'primary' ? 'btn-primary' : 'btn-ghost'} w-full h-12 ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.625rem',
        fontSize: '0.9375rem',
        fontWeight: 600,
      }}
    >
      {/* Shield-with-keyhole: generic SSO mark, no third-party brand to get wrong. */}
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        style={{ width: 20, height: 20, flexShrink: 0 }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3l7 3v5c0 4.4-2.9 8.4-7 9.7C7.9 19.4 5 15.4 5 11V6l7-3z"
        />
        <circle cx="12" cy="10.5" r="1.75" />
        <path strokeLinecap="round" d="M12 12.25v3" />
      </svg>
      Continue with {providerName}
    </button>
  );
}

export default AutheliaButton;
