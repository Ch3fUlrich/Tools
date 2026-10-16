import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserProfile } from '../UserProfile';
import * as AuthContext from '../AuthContext';
import * as apiClient from '@/lib/api/client';

// Mock the dependencies
vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
}));

describe('UserProfile', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    created_at: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing if no user is provided', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      logout: vi.fn(),
      login: vi.fn(),
      isLoading: false,
      isAuthenticated: false,
      refreshAuth: vi.fn(),
    });

    const { container } = render(<UserProfile />);
    expect(container).toBeEmptyDOMElement();
  });

  it('handles logout error path gracefully', async () => {
    const mockLogout = vi.fn().mockRejectedValue(new Error('Logout failed'));
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      login: vi.fn(),
      isLoading: false,
      isAuthenticated: true,
      refreshAuth: vi.fn(),
    });

    vi.mocked(apiClient.getUserProfile).mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      created_at: '2023-01-01T00:00:00Z',
      display_name: 'Test User',
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<UserProfile />);

    const logoutButton = await screen.findByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error));
    expect(consoleSpy.mock.calls[0][1].message).toBe('Logout failed');

    consoleSpy.mockRestore();
  });

  it('handles save error gracefully', async () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      logout: vi.fn(),
      login: vi.fn(),
      isLoading: false,
      isAuthenticated: true,
      refreshAuth: vi.fn(),
    });

    vi.mocked(apiClient.getUserProfile).mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      created_at: '2023-01-01T00:00:00Z',
      display_name: 'Test User',
    });

    const mockUpdateProfile = vi.fn().mockRejectedValue(new Error('Update failed'));
    vi.mocked(apiClient.updateUserProfile).mockImplementation(mockUpdateProfile);

    render(<UserProfile />);

    // Wait for the component to fetch profile and render the initial
    const editButton = await screen.findByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    const input = await screen.findByPlaceholderText('Display name');
    fireEvent.change(input, { target: { value: 'New Name' } });

    const saveButton = await screen.findByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    // Should display the error message
    await waitFor(() => {
      expect(screen.getByText('Failed to save display name.')).toBeInTheDocument();
    });
  });

  it('handles profile fetch failure', async () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      logout: vi.fn(),
      login: vi.fn(),
      isLoading: false,
      isAuthenticated: true,
      refreshAuth: vi.fn(),
    });

    vi.mocked(apiClient.getUserProfile).mockRejectedValue(new Error('Fetch failed'));

    render(<UserProfile />);

    // Should fall back to auth context user email
    const emailElem = await screen.findByText('test@example.com');
    expect(emailElem).toBeInTheDocument();
  });
});
