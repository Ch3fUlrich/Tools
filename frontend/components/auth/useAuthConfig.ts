'use client';

import { useEffect, useState } from 'react';
import { getAuthConfig, type AuthConfig } from '@/lib/api/client';

/**
 * What we assume until the backend says otherwise: every method is available.
 *
 * The optimism is deliberate. If `/api/auth/config` is unreachable we must not hide sign-in
 * controls — a user looking at a panel with no buttons has no way in at all, whereas a
 * button that turns out to be disabled server-side merely produces an honest error.
 */
export const OPTIMISTIC_AUTH_CONFIG: AuthConfig = {
  localAuthEnabled: true,
  oidcEnabled: true,
  oidcProviderName: 'Authelia',
};

/**
 * Which sign-in methods this deployment accepts.
 *
 * The frontend is a static export and cannot read the backend's environment at build time,
 * so it asks once per mount and falls back to {@link OPTIMISTIC_AUTH_CONFIG} on any failure.
 */
export function useAuthConfig(): AuthConfig {
  const [config, setConfig] = useState<AuthConfig>(OPTIMISTIC_AUTH_CONFIG);

  useEffect(() => {
    let cancelled = false;
    // Wrapped in a resolved promise so a throwing or missing client function lands in the
    // same catch as a network failure, rather than escaping as an unhandled error.
    Promise.resolve()
      .then(() => getAuthConfig())
      .then((remote) => {
        if (!cancelled && remote) setConfig({ ...OPTIMISTIC_AUTH_CONFIG, ...remote });
      })
      .catch(() => {
        /* keep the optimistic default — see the constant's comment */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}
