import { renderHook, waitFor } from '@testing-library/react';
import {
  useAuthConfig,
  OPTIMISTIC_AUTH_CONFIG,
} from '../components/auth/useAuthConfig';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiClient from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  getAuthConfig: vi.fn(),
}));

describe('useAuthConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns OPTIMISTIC_AUTH_CONFIG initially', () => {
    vi.mocked(apiClient.getAuthConfig).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuthConfig());

    expect(result.current).toEqual(OPTIMISTIC_AUTH_CONFIG);
  });

  it('updates config when getAuthConfig resolves successfully', async () => {
    const remoteConfig = {
      localAuthEnabled: false,
      oidcEnabled: true,
      oidcProviderName: 'TestProvider',
    };

    vi.mocked(apiClient.getAuthConfig).mockResolvedValue(remoteConfig);

    const { result } = renderHook(() => useAuthConfig());

    expect(result.current).toEqual(OPTIMISTIC_AUTH_CONFIG);

    await waitFor(() => {
      expect(result.current).toEqual({
        ...OPTIMISTIC_AUTH_CONFIG,
        ...remoteConfig,
      });
    });
  });

  it('keeps OPTIMISTIC_AUTH_CONFIG when getAuthConfig fails', async () => {
    vi.mocked(apiClient.getAuthConfig).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useAuthConfig());

    await waitFor(() => {
      expect(apiClient.getAuthConfig).toHaveBeenCalled();
    });

    // Wait a short time to allow promise catch block to execute
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(result.current).toEqual(OPTIMISTIC_AUTH_CONFIG);
  });

  it('does not update state if unmounted before promise resolves', async () => {
    let resolvePromise: (val: any) => void;
    const promise = new Promise<any>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(apiClient.getAuthConfig).mockReturnValue(promise);

    const { result, unmount } = renderHook(() => useAuthConfig());

    unmount();

    resolvePromise!({
      localAuthEnabled: false,
      oidcEnabled: true,
      oidcProviderName: 'OtherProvider',
    });

    await waitFor(() => {
      expect(apiClient.getAuthConfig).toHaveBeenCalled();
    });

    expect(result.current).toEqual(OPTIMISTIC_AUTH_CONFIG);
  });
});
