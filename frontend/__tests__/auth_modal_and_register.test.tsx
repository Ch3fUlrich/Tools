// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// vitest provides globals including `vi`

// Ensure components that import '@/lib/api/client' resolve during single-file runs by mocking
// the aliased module to re-export the real module via a relative path.
vi.mock('@/lib/api/client', async () => {
  return await import('../lib/api/client');
});

import { AuthModal } from '../components/auth/AuthModal';
import { RegisterForm } from '../components/auth/RegisterForm';
import * as api from '../lib/api/client';

describe('AuthModal and RegisterForm', () => {
  test('AuthModal renders Login by default and can switch to Register', async () => {
    const onClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={onClose} defaultMode="login" />);

  // LoginForm has a Sign In button; assert it exists
  expect(screen.getByRole('button', { name: /Sign In/i })).toBeTruthy();

  // Switch to register via the modal's "Sign up" button
  const switchButton = screen.getByRole('button', { name: /Sign up/i });
  fireEvent.click(switchButton);

  expect(await screen.findByRole('heading', { name: /Create Account/i })).toBeInTheDocument();
  });

  test('AuthModal close button calls onClose and nested onSuccess triggers onClose', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    // Render modal in register mode so RegisterForm is shown
    render(<AuthModal isOpen={true} onClose={onClose} defaultMode="register" onSuccess={onSuccess} />);

    // Ensure RegisterForm heading is visible
    expect(await screen.findByRole('heading', { name: /Create Account/i })).toBeInTheDocument();

    // Click the close (X) button - picking the button whose child svg has class 'w-6' (the X icon)
    const allButtons = screen.getAllByRole('button');
    const closeButton = allButtons.find((b) => {
      const svg = b.querySelector('svg');
      return svg?.classList.contains('w-6');
    });
    expect(closeButton).toBeTruthy();
    // Click using userEvent so events bubble correctly
    await userEvent.click(closeButton!);

    expect(onClose).toHaveBeenCalled();

    // Now re-render modal and simulate nested success: RegisterForm calls onSuccess passed from modal
  onClose.mockClear();
  // Cleanup DOM from prior render before re-rendering modal
  cleanup();
    const registerSuccess = vi.fn(() => {
      /* noop */
    });

    // Spy registerUser to resolve immediately so RegisterForm's onSuccess will be called when submitting
    const registerSpy = vi.spyOn(api, 'registerUser').mockResolvedValue(undefined as any);

    render(<AuthModal isOpen={true} onClose={onClose} defaultMode="register" onSuccess={registerSuccess} />);

    // Fill form with valid data
    await userEvent.type(screen.getByLabelText('Email'), 'new@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'password123');

    // Submit
    fireEvent.submit(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => expect(registerSpy).toHaveBeenCalled());

    // onSuccess passed to modal should have been invoked by handleSuccess and thus onClose should be called as well
    expect(registerSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();

    registerSpy.mockRestore();
  });

  test('RegisterForm shows validation errors and calls OIDC start', async () => {
    const onSuccess = vi.fn();
  const startSpy = vi.spyOn(api, 'startOIDCLogin').mockImplementation(() => undefined);
  const registerSpy = vi.spyOn(api, 'registerUser').mockResolvedValue(undefined as any);

    render(<RegisterForm onSuccess={onSuccess} />);

    // Try mismatched passwords
    await userEvent.type(screen.getByLabelText('Email'), 'me@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'different');

    fireEvent.submit(screen.getByRole('button', { name: /Create Account/i }));

    expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();

    // Now provide short password
  // set password fields via fireEvent.change to avoid userEvent.clear typing API differences
  // set both fields to a short password to trigger the length validation
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
  fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'short' } });

    fireEvent.submit(screen.getByRole('button', { name: /Create Account/i }));

    expect(await screen.findByText(/Password must be at least 8 characters long/i)).toBeInTheDocument();

    // Click OIDC button
    const oidcButton = screen.getByRole('button', { name: /Continue with Google/i });
    fireEvent.click(oidcButton);
    expect(startSpy).toHaveBeenCalled();

    // Now fill valid password and submit to trigger registerUser
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
  fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } });

    fireEvent.submit(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => expect(registerSpy).toHaveBeenCalled());
    startSpy.mockRestore();
    registerSpy.mockRestore();
  });
});
