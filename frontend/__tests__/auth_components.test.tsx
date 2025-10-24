import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/components/auth/AuthContext';
import { UserProfile } from '@/components/auth/UserProfile';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginForm } from '@/components/auth/LoginForm';

// Mock router with a shared push mock so tests can assert it was called
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

// Mock API client where needed
vi.mock('@/lib/api/client', async () => {
  return {
    loginUser: vi.fn().mockResolvedValue({ ok: true, id: 'u1' }),
    startOIDCLogin: vi.fn(),
    logoutUser: vi.fn().mockResolvedValue({ ok: true }),
  };
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('Auth components', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it('AuthProvider persists and restores user via localStorage', async () => {
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
      <Wrapper>
        <TestComp />
      </Wrapper>
    );

    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('email').textContent).toBe('a@b.com'));

    // unmount and remount to check persistence
    unmount();

    render(
      <Wrapper>
        <TestComp />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByTestId('email').textContent).toBe('a@b.com'));
  });

  it('UserProfile shows user and calls logout', async () => {
    // set localstorage user so AuthProvider picks it up
    localStorage.setItem('auth_user', JSON.stringify({ id: '1', email: 'u@u.com', created_at: new Date().toISOString() }));

    render(
      <Wrapper>
        <UserProfile />
      </Wrapper>
    );

    expect(screen.getByText('u@u.com')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Logout'));

    await waitFor(() => expect(screen.queryByText('u@u.com')).not.toBeInTheDocument());
  });

  it('ProtectedRoute redirects when unauthenticated', async () => {
    // render ProtectedRoute while mocked push is in scope
    render(
      <Wrapper>
        <ProtectedRoute>
          <div>Protected</div>
        </ProtectedRoute>
      </Wrapper>
    );

    // wait for effect: shared push mock should be called
    await waitFor(() => expect(push).toHaveBeenCalled());
  });

  it('LoginForm calls loginUser and startOIDCLogin', async () => {
    const { loginUser, startOIDCLogin } = await import('@/lib/api/client');

    render(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    );

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } });
    fireEvent.click(screen.getByText('Sign In'));

    await waitFor(() => expect(loginUser).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Continue with Google'));
    expect(startOIDCLogin).toHaveBeenCalled();
  });
});
