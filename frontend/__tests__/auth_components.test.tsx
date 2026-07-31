// Mock router with a shared push mock so tests can assert it was called
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useAuth } from '@/components/auth/AuthContext';
import { UserProfile } from '@/components/auth/UserProfile';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginForm } from '@/components/auth/LoginForm';

// Mock API client where needed
vi.mock('@/lib/api/client', async () => {
  return {
    loginUser: vi.fn().mockResolvedValue({ ok: true, id: 'u1' }),
    startOIDCLogin: vi.fn(),
    logoutUser: vi.fn().mockResolvedValue({ ok: true }),
    getUserProfile: vi.fn().mockResolvedValue({ id: '1', email: 'u@u.com', display_name: undefined, created_at: new Date().toISOString() }),
    updateUserProfile: vi.fn().mockResolvedValue(undefined),
  };
});

import { TestWrapper } from '@/lib/test-utils';

describe('Auth components', () => {
  beforeEach(() => {
    // Clear both storages so sessionStorage doesn't leak between tests
    try {
      localStorage.clear();
      sessionStorage.clear();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      // Ignore if storage is unavailable in environment
    }
    // clearAllMocks preserves mock implementations (mockResolvedValue etc.)
    // while resetting call history — resetAllMocks would strip implementations
    // and cause getUserProfile() to return undefined, crashing the UserProfile mount.
    vi.clearAllMocks();
  });

  it('AuthProvider persists and restores user via localStorage', async () => {
    // Override the mock specifically for this test since AuthProvider
    // will try to fetch the profile of the user we login as.
    const { getUserProfile } = await import('@/lib/api/client');
    (getUserProfile as any).mockResolvedValueOnce({ id: '1', email: 'a@b.com', display_name: undefined, created_at: new Date().toISOString() });

    const TestComp = () => {
      const { login, user } = useAuth();
      return (
        <div>
          <button onClick={() => login({ id: '1', email: 'a@b.com', created_at: new Date().toISOString() })}>Login</button>
          <div data-testid="email">{user?.email ?? ''}</div>
        </div>
      );
    };

    const { unmount } = render(
      <TestWrapper>
        <TestComp />
      </TestWrapper>
    );

    // TestWrapper renders AuthProvider, which checks localstorage on mount and may call getUserProfile.
    // Let's clear the mock history again after initial mount so it doesn't affect subsequent assertions if any
    vi.clearAllMocks();
    (getUserProfile as any).mockResolvedValue({ id: '1', email: 'a@b.com', display_name: undefined, created_at: new Date().toISOString() });

    await act(async () => {
        fireEvent.click(screen.getByText('Login'));
    });

    await waitFor(() => expect(screen.getByTestId('email').textContent).toBe('a@b.com'));

    // unmount and remount to check persistence
    unmount();

    render(
      <TestWrapper>
        <TestComp />
      </TestWrapper>
    );

    await waitFor(() => expect(screen.getByTestId('email').textContent).toBe('a@b.com'));
  });

  it('UserProfile shows user and calls logout', async () => {
    // set localstorage user so AuthProvider picks it up
    localStorage.setItem('auth_user', JSON.stringify({ id: '1', email: 'u@u.com', created_at: new Date().toISOString() }));

    const { getUserProfile } = await import('@/lib/api/client');
    (getUserProfile as any).mockResolvedValue({ id: '1', email: 'u@u.com', display_name: undefined, created_at: new Date().toISOString() });


    await act(async () => {
      render(
        <TestWrapper>
          <UserProfile />
        </TestWrapper>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('u@u.com')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Logout'));
    });

    await waitFor(() => expect(screen.queryByText('u@u.com')).not.toBeInTheDocument());
  });

  it('ProtectedRoute redirects when unauthenticated', async () => {
    // render ProtectedRoute while mocked push is in scope
    await act(async () => {
      render(
        <TestWrapper>
          <ProtectedRoute>
            <div>Protected</div>
          </ProtectedRoute>
        </TestWrapper>
      );
    });

    // wait for effect: shared push mock should be called
    await waitFor(() => expect(push).toHaveBeenCalled());
  });

  it('LoginForm calls loginUser and startOIDCLogin', async () => {
    const { loginUser, startOIDCLogin } = await import('@/lib/api/client');

    await act(async () => {
      render(
        <TestWrapper>
          <LoginForm onSuccess={() => {}} onSwitchMode={() => {}} onClose={() => {}} />
        </TestWrapper>
      );
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'a@b.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    });

    await waitFor(() => expect(loginUser).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByText('Continue with Google'));
    });
    expect(startOIDCLogin).toHaveBeenCalled();
  });
});
