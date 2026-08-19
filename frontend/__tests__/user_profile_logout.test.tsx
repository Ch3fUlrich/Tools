import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UserProfile } from '@/components/auth/UserProfile';
import * as AuthContextModule from '@/components/auth/AuthContext';
import * as ApiClientModule from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
}));

describe('UserProfile', () => {
  let mockLogout: import("vitest").Mock<() => Promise<void>>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockLogout = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: '1', email: 'test@example.com', created_at: new Date().toISOString() },
      logout: mockLogout,
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      refreshAuth: vi.fn(),
    });

    vi.mocked(ApiClientModule.getUserProfile).mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
      display_name: 'Test User',
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('handles logout error gracefully', async () => {
    const error = new Error('Logout failed');
    mockLogout.mockRejectedValueOnce(error);

    render(<UserProfile />);

    // Wait for initial profile fetch
    await waitFor(() => expect(screen.getByText('Test User')).toBeInTheDocument());

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Logout error:', error);
    });
  });
});
