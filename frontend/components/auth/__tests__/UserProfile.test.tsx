import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { UserProfile } from '../UserProfile';
import { useAuth } from '../AuthContext';
import { getUserProfile, updateUserProfile } from '@/lib/api/client';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
}));

// Mock the AuthContext
vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('UserProfile', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    created_at: '2023-01-01T00:00:00Z',
  };

  const mockProfile = {
    id: '1',
    email: 'test@example.com',
    display_name: 'Test User',
    created_at: '2023-01-01T00:00:00Z',
  };

  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock setup for useAuth to return user
    (useAuth as Mock).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    });
    // Default mock setup for API
    (getUserProfile as Mock).mockResolvedValue(mockProfile);
    (updateUserProfile as Mock).mockResolvedValue(mockProfile);
  });

  it('renders null when user is not present', () => {
    (useAuth as Mock).mockReturnValue({ user: null, logout: mockLogout });
    const { container } = render(<UserProfile />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the user profile successfully', async () => {
    render(<UserProfile />);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('handles error when fetching user profile fails', async () => {
    // Should swallow error and fall back to useAuth user data
    (getUserProfile as Mock).mockRejectedValue(new Error('Fetch failed'));

    render(<UserProfile />);

    await waitFor(() => {
      // It uses the email if display_name is not available
      expect(screen.getAllByText('test@example.com').length).toBeGreaterThan(0);
    });
  });

  it('successfully updates display name', async () => {
    render(<UserProfile />);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('edit'));

    const input = screen.getByPlaceholderText('Display name');
    fireEvent.change(input, { target: { value: 'New Name' } });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalledWith('New Name');
    });

    // We expect it to switch out of editing mode
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Display name')).not.toBeInTheDocument();
    });
  });

  it('can update display name with empty string (clearing it)', async () => {
    render(<UserProfile />);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('edit'));

    const input = screen.getByPlaceholderText('Display name');
    fireEvent.change(input, { target: { value: '' } });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalledWith('');
    });
  });

  it('can cancel editing display name', async () => {
    render(<UserProfile />);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('edit'));

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Display name')).not.toBeInTheDocument();
    });
  });

  it('renders the error path when saving display name fails', async () => {
    (updateUserProfile as Mock).mockRejectedValue(new Error('Network error'));

    render(<UserProfile />);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('edit'));

    const input = screen.getByPlaceholderText('Display name');
    fireEvent.change(input, { target: { value: 'New Name' } });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Failed to save display name.')).toBeInTheDocument();
    });

    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Display name')).toBeInTheDocument();
  });

  it('handles logout successfully', async () => {
    render(<UserProfile />);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  it('logs error when logout fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockError = new Error('Logout failed');
    mockLogout.mockRejectedValue(mockError);

    render(<UserProfile />);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Logout error:', mockError);
    });

    consoleSpy.mockRestore();
  });

  it('uses auth fallback date if profile created_at is missing', async () => {
    // Return a profile without created_at
    (getUserProfile as Mock).mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      display_name: 'Test User',
      // no created_at
    });

    render(<UserProfile />);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    const expectedDate = new Date(mockUser.created_at).toLocaleDateString();
    expect(screen.getByText(`Member since ${expectedDate}`)).toBeInTheDocument();
  });
});
