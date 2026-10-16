import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuth, AuthProvider } from '../AuthContext';
import { getUserProfile } from '@/lib/api/client';


// Mock the API client as required by project guidelines
vi.mock('@/lib/api/client', () => ({
  logoutUser: vi.fn().mockResolvedValue(undefined),
  getUserProfile: vi.fn().mockResolvedValue({
    id: '1',
    email: 'test@example.com',
    created_at: '2023-01-01T00:00:00Z',
  }),
}));

vi.mock('@/lib/api/backendStatus', () => ({
  checkBackend: vi.fn().mockResolvedValue(true),
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws an error when used outside of AuthProvider', () => {
    // Suppress console.error for the expected React error boundary throw
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );

    consoleSpy.mockRestore();
  });

  it('returns context successfully when used within AuthProvider', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for initial render to complete without warnings.
    // refreshAuth runs an async function in useEffect.
    await act(async () => {
      // Just wait a tick for useEffects
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isAuthenticated');
    expect(result.current).toHaveProperty('login');
    expect(result.current).toHaveProperty('logout');
    expect(result.current).toHaveProperty('refreshAuth');

    // Initial state checks
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('handles backend 401/error and leaves local user in case of offline but does not throw', async () => {
    const mockUser = {
      id: 'stored-1',
      email: 'stored@example.com',
      created_at: '2023-01-01T00:00:00Z',
    };
    sessionStorage.setItem('auth_user', JSON.stringify(mockUser));

    // Simulate backend throwing an error (e.g., unreachable or 401 if we want to catch the specific branch logic)
    // The current code has a generic catch {} block that just ignores it.
    (getUserProfile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Backend rejected session'));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // It should keep the user because the try/catch around getUserProfile swallows the error
    // (the comment says "Backend unreachable or session invalid — keep showing stored user")
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });
});
