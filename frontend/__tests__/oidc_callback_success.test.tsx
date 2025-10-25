// @vitest-environment jsdom
import React from 'react';
import { render } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

// Mock router
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

// Mock useAuth login
const login = vi.fn();
vi.mock('@/components/auth', () => ({ useAuth: () => ({ login }) }));

// Stub global location.search
const originalLocation = global.window.location;

function setSearch(search: string) {
  // @ts-ignore
  delete global.window.location;
  // @ts-ignore
  global.window.location = { search } as Location;
}

import OIDCPage from '@/app/auth/oidc/callback/page';

describe('OIDC callback success', () => {
  test('handles success and calls login then navigates', async () => {
    // Mock successful fetch response
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: { id: '1', email: 'a@b.com' } }) });

    setSearch('?code=abc&state=1');
    render(<OIDCPage />);

    // wait for side effects (login and router.push)
    await new Promise((r) => setTimeout(r, 10));
    expect(login).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/');

    // restore
    // @ts-ignore
    global.window.location = originalLocation;
  });
});
