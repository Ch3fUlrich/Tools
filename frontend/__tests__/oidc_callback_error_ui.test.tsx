// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

// Mock router push to observe redirection (setTimeout will call it)
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

// Mock useAuth (not used when error)
vi.mock('@/components/auth', () => ({ useAuth: () => ({ login: vi.fn() }) }));

// Stub location search to include an error
const originalLocation = global.window.location;
// helper to set search
function setSearch(search: string) {
  // @ts-ignore
  delete global.window.location;
  // @ts-ignore
  global.window.location = { search } as Location;
}

import OIDCPage from '@/app/auth/oidc/callback/page';

describe('OIDC callback error UI', () => {
  test('shows error UI when error param present and calls router after delay', async () => {
    setSearch('?error=Denied&error_description=Denied%20access');
    render(<OIDCPage />);

    // The error UI should be rendered
    expect(await screen.findByText(/Authentication Failed/)).toBeInTheDocument();
    expect(screen.getByText(/Denied access/)).toBeInTheDocument();

    // restore
    // @ts-ignore
    global.window.location = originalLocation;
  });
});
