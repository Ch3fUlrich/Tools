import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutheliaButton } from '@/components/auth/AutheliaButton';
import { startOIDCLogin } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  startOIDCLogin: vi.fn(),
}));

describe('AutheliaButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<AutheliaButton />);
    const button = screen.getByRole('button', { name: /Continue with Authelia/i });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain('btn-primary');
  });

  it('renders with custom providerName', () => {
    render(<AutheliaButton providerName="CustomSSO" />);
    expect(screen.getByRole('button', { name: /Continue with CustomSSO/i })).toBeInTheDocument();
  });

  it('renders with ghost variant', () => {
    render(<AutheliaButton variant="ghost" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('btn-ghost');
  });

  it('applies custom className', () => {
    render(<AutheliaButton className="custom-class" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('custom-class');
  });

  it('calls startOIDCLogin on click', () => {
    render(<AutheliaButton />);
    fireEvent.click(screen.getByRole('button', { name: /Continue with Authelia/i }));
    expect(startOIDCLogin).toHaveBeenCalledTimes(1);
  });
});
