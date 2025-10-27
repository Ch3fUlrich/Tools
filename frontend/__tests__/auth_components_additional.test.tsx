/* global Storage */
/// <reference types="vitest/globals" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { RegisterForm } from '@/components/auth/RegisterForm';
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthModal } from '@/components/auth/AuthModal';
import { AuthProvider, useAuth } from '@/components/auth/AuthContext';
import * as apiClient from '@/lib/api/client';

describe('RegisterForm', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows validation error for mismatched passwords', async () => {
    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password1');
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'password2');
    fireEvent.submit(screen.getByRole('button', { name: /Create Account/i }).closest('form')!);
    expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
  });

  it('shows validation error for short password', async () => {
    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'short');
    fireEvent.submit(screen.getByRole('button', { name: /Create Account/i }).closest('form')!);
    expect(await screen.findByText(/Password must be at least 8 characters long/i)).toBeInTheDocument();
  });

  it('calls registerUser on success', async () => {
    const spy = vi.spyOn(apiClient, 'registerUser').mockResolvedValue({ ok: true } as any);
    const onSuccess = vi.fn();
    render(<RegisterForm onSuccess={onSuccess} />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'longpassword');
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'longpassword');
    fireEvent.submit(screen.getByRole('button', { name: /Create Account/i }).closest('form')!);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(onSuccess).toHaveBeenCalled();
  });
});

describe('LoginForm', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls loginUser on submit and handles success', async () => {
    const spy = vi.spyOn(apiClient, 'loginUser').mockResolvedValue({ ok: true } as any);
    const onSuccess = vi.fn();
    render(<LoginForm onSuccess={onSuccess} />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password');
    fireEvent.submit(screen.getByRole('button', { name: /Sign In/i }).closest('form')!);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows error when login fails', async () => {
    vi.spyOn(apiClient, 'loginUser').mockRejectedValue(new Error('bad creds'));
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password');
    fireEvent.submit(screen.getByRole('button', { name: /Sign In/i }).closest('form')!);
    expect(await screen.findByText(/bad creds/i)).toBeInTheDocument();
  });
});

describe('AuthModal and AuthContext', () => {
  it('renders login by default and switches to register', async () => {
    const onClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={onClose} defaultMode="login" />);
    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    // click switch to register via the 'Sign up' button within LoginForm
    fireEvent.click(screen.getByText(/Sign up/i));
    // assert heading 'Create Account' is present (use role to avoid matching the button text)
    expect(await screen.findByRole('heading', { name: /Create Account/i })).toBeInTheDocument();
  });

  it('AuthProvider login/logout persists to localStorage', async () => {
    // ensure no leftover auth state from other tests
    try {
      localStorage.clear();
      sessionStorage.clear();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      // ignore
    }
    const Test = () => {
      const auth = useAuth();
      return (
      <div>
        <div>auth:{auth.isAuthenticated ? 'yes' : 'no'}</div>
        {/* pass remember=true so login persists to localStorage (not just sessionStorage) */}
        <button onClick={() => auth.login({ id: '1', email: 'a@b.com', created_at: 'now' }, true)}>login</button>
          <button onClick={() => auth.logout()}>logout</button>
        </div>
      );
    };

    render(
      <AuthProvider>
        <Test />
      </AuthProvider>
    );

    expect(screen.getByText(/auth:no/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('login'));
    expect(screen.getByText(/auth:yes/i)).toBeInTheDocument();
    expect(localStorage.getItem('auth_user')).toBeTruthy();
    fireEvent.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByText(/auth:no/i)).toBeInTheDocument());
  });

  it('handles localStorage errors gracefully', async () => {
    // Mock localStorage to throw errors
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error('Storage quota exceeded');
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const Test = () => {
      const auth = useAuth();
      return (
        <div>
          <div>auth:{auth.isAuthenticated ? 'yes' : 'no'}</div>
          <button onClick={() => auth.login({ id: '1', email: 'a@b.com', created_at: 'now' }, true)}>login</button>
        </div>
      );
    };

    render(
      <AuthProvider>
        <Test />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('login'));

    // Should still work despite storage error
    expect(screen.getByText(/auth:yes/i)).toBeInTheDocument();
    expect(consoleWarnSpy).toHaveBeenCalledWith('Could not persist auth_user:', expect.any(Error));

    // Restore mocks
    Storage.prototype.setItem = originalSetItem;
    consoleWarnSpy.mockRestore();
  });

  it('handles useAuth outside provider', () => {
    const Test = () => {
      useAuth();
      return <div>test</div>;
    };

    expect(() => render(<Test />)).toThrow('useAuth must be used within an AuthProvider');
  });
});
