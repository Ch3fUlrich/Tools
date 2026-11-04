import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { LoginForm } from '../LoginForm';
import { loginUser } from '@/lib/api/client';

// Mock the useAuthConfig hook
vi.mock('../useAuthConfig', () => ({
  useAuthConfig: () => ({
    oidcProviderName: 'Authelia',
  }),
}));

// Mock AutheliaButton component
vi.mock('../AutheliaButton', () => ({
  AutheliaButton: () => <button>Login with Authelia</button>,
}));

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  loginUser: vi.fn(),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders successfully', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Sign In/i })
    ).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    const onSuccessMock = vi.fn();
    (loginUser as Mock).mockResolvedValueOnce({ success: true });

    render(<LoginForm onSuccess={onSuccessMock} />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(loginUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });
  });

  it('handles login failure and displays error message', async () => {
    const errorMessage = 'Invalid email or password';
    (loginUser as Mock).mockRejectedValueOnce(new Error(errorMessage));

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'wrongpassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(loginUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'wrongpassword',
      });
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('handles login failure with non-Error object', async () => {
    (loginUser as Mock).mockRejectedValueOnce('Some string error');

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'wrongpassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(loginUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'wrongpassword',
      });
      expect(screen.getByText('Login failed')).toBeInTheDocument();
    });
  });

  it('calls onClose when the close button is clicked', () => {
    const onCloseMock = vi.fn();
    render(<LoginForm onClose={onCloseMock} />);

    const closeButton = screen.getByRole('button', { name: /Close/i });
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('calls onSwitchMode when the sign up button is clicked', () => {
    const onSwitchModeMock = vi.fn();
    render(<LoginForm onSwitchMode={onSwitchModeMock} />);

    const signUpButton = screen.getByRole('button', { name: /Sign up/i });
    expect(signUpButton).toBeInTheDocument();

    fireEvent.click(signUpButton);
    expect(onSwitchModeMock).toHaveBeenCalledTimes(1);
  });
});
