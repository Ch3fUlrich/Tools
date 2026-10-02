import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useOptionalAuth, useAuth, AuthProvider } from './AuthContext';

// Every frontend test file must mock `@/lib/api/client`
vi.mock('@/lib/api/client', () => ({
  logoutUser: vi.fn(),
  getUserProfile: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/api/backendStatus', () => ({
  checkBackend: vi.fn().mockResolvedValue(true),
}));

describe('AuthContext Hooks', () => {
  describe('useOptionalAuth', () => {
    it('returns null when used outside of AuthProvider', () => {
      const { result } = renderHook(() => useOptionalAuth());
      expect(result.current).toBeNull();
    });

    it('returns the auth context when used inside AuthProvider', async () => {
      const { result } = renderHook(() => useOptionalAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      expect(result.current).not.toBeNull();
      expect(result.current?.isLoading).toBe(true);
      expect(result.current?.isAuthenticated).toBe(false);
      expect(result.current?.user).toBeNull();

      await waitFor(() => {
        expect(result.current?.isLoading).toBe(false);
      }, { timeout: 5000 });
    });
  });

  describe('useAuth', () => {
    it('throws an error when used outside of AuthProvider', () => {
      // Suppress the expected React error boundary console output
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleError.mockRestore();
    });

    it('returns the auth context when used inside AuthProvider', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      expect(result.current).toBeDefined();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });
    });
  });
});
