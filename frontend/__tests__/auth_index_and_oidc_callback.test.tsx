import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Quick test to ensure auth index re-exports exist
test('auth index exports expected symbols', async () => {
  const authIndex = await import('@/components/auth');
  expect(authIndex.AuthModal).toBeDefined();
  expect(authIndex.AuthProvider).toBeDefined();
  expect(authIndex.useAuth).toBeDefined();
  expect(authIndex.LoginForm).toBeDefined();
  expect(authIndex.RegisterForm).toBeDefined();
  expect(authIndex.ProtectedRoute).toBeDefined();
});

// Tests for OIDC callback page
// Mock router and useAuth prior to importing the module under test
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

const loginMock = vi.fn();
vi.mock('@/components/auth/AuthContext', () => ({
  useAuth: () => ({ login: loginMock }),
  AuthProvider: ({ children }: any) => children,
}));

import OIDCCallback from '@/app/auth/oidc/callback/page';

describe('OIDC callback page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    pushMock.mockClear();
    loginMock.mockClear();
  });

  test('successful callback exchanges code and logs in user', async () => {
    // set window.location.search
    const original = window.location;
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = { search: '?code=abc123&state=state' } as any;

    // mock fetch
    const fakeUser = { id: '1', email: 'me@example.com' };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: fakeUser }) } as any);

    render(<OIDCCallback />);

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith(fakeUser));
    expect(pushMock).toHaveBeenCalled();

    // restore
    // @ts-ignore
    window.location = original;
  });

  test('error path shows error UI', async () => {
    const original = window.location;
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = { search: '?error=access_denied&error_description=Denied' } as any;

    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'fail' }) } as any);

    render(<OIDCCallback />);

    await waitFor(() => expect(screen.getByText(/Authentication Failed/i)).toBeInTheDocument());

    // restore
    // @ts-ignore
    window.location = original;
  });
});
