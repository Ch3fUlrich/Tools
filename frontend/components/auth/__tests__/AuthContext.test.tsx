import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAuth, AuthProvider } from '../AuthContext';

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

  it('handles storage errors gracefully during login and logout', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Mock storage methods to throw
    const setItemSpy = vi.spyOn(globalThis.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const removeItemSpy = vi.spyOn(globalThis.localStorage, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Trigger login with remember=true
    act(() => {
      result.current.login({ id: '2', email: 'test2@example.com', created_at: 'now' }, true);
    });

    expect(result.current.user).toEqual({ id: '2', email: 'test2@example.com', created_at: 'now' });
    expect(consoleWarnSpy).toHaveBeenCalledWith('Could not persist auth_user:', expect.any(Error));

    // Trigger logout (which clears user)
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();

    setItemSpy.mockRestore();
    removeItemSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
