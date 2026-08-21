import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  markBackendOnline,
  markBackendOffline,
  getBackendStatus,
  isBackendOffline,
  subscribeBackendStatus,
  resetBackendStatusForTests,
  checkBackend,
  useBackendStatus
} from '../lib/api/backendStatus';
import { renderHook, act } from '@testing-library/react';

describe('backendStatus state transitions', () => {
  beforeEach(() => {
    resetBackendStatusForTests();
  });

  it('should initially have "unknown" status', () => {
    expect(getBackendStatus()).toBe('unknown');
    expect(isBackendOffline()).toBe(false);
  });

  it('should mark backend offline and update status to "offline"', () => {
    markBackendOffline();
    expect(getBackendStatus()).toBe('offline');
    expect(isBackendOffline()).toBe(true);
  });

  it('should mark backend online and update status to "online"', () => {
    markBackendOnline();
    expect(getBackendStatus()).toBe('online');
    expect(isBackendOffline()).toBe(false);
  });

  it('should notify listeners when status changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeBackendStatus(listener);

    markBackendOffline();
    expect(listener).toHaveBeenCalledTimes(1);

    markBackendOnline();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it('should not notify listeners if status does not change', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeBackendStatus(listener);

    // Initial state is 'unknown'. Setting it to 'unknown' (if we had a generic setter) wouldn't trigger it.
    // Setting to offline triggers it once.
    markBackendOffline();
    expect(listener).toHaveBeenCalledTimes(1);

    // Setting it to offline again should not trigger the listener again.
    markBackendOffline();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });
});

describe('checkBackend', () => {
  let fetchSpy: any;

  beforeEach(() => {
    resetBackendStatusForTests();
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    // Mock Date.now to control TTL consistently in some tests if needed
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should probe the backend when status is unknown', async () => {
    const result = await checkBackend();
    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(getBackendStatus()).toBe('online');
  });

  it('should use cached status when not forced and TTL is valid', async () => {
    await checkBackend();
    fetchSpy.mockClear();

    // Default TTL should be 5 mins for online status.
    // Move time forward a bit
    vi.setSystemTime(Date.now() + 60_000); // 1 minute later

    const result = await checkBackend();
    expect(result).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should probe again if TTL has expired', async () => {
    await checkBackend();
    fetchSpy.mockClear();

    // ONLINE_RECHECK_MS is 5 minutes (300,000ms)
    vi.setSystemTime(Date.now() + 301_000); // 5 mins + 1s later

    const result = await checkBackend();
    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should ignore cache and probe again when forced', async () => {
    await checkBackend();
    fetchSpy.mockClear();

    const result = await checkBackend(true);
    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should return false and update status to offline if probe fails', async () => {
    resetBackendStatusForTests(); // Reset state
    fetchSpy.mockClear(); // Clear spy history
    fetchSpy.mockResolvedValueOnce({ ok: false } as Response);

    const result = await checkBackend();
    expect(result).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(getBackendStatus()).toBe('offline');
  });

  it('should return false if fetch throws an error', async () => {
    resetBackendStatusForTests(); // Reset state
    fetchSpy.mockClear(); // Clear spy history
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    const result = await checkBackend();
    expect(result).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(getBackendStatus()).toBe('offline');
  });

  it('should share inflight probe for concurrent requests', async () => {
    resetBackendStatusForTests(); // Reset state
    fetchSpy.mockClear(); // Clear spy history
    // Create a slow fetch to ensure concurrent calls overlap
    fetchSpy.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true } as Response), 10)));

    const [result1, result2] = await Promise.all([
      checkBackend(),
      checkBackend()
    ]);

    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('useBackendStatus hook should return current status and update when it changes', () => {
    const { result } = renderHook(() => useBackendStatus());
    expect(result.current).toBe('unknown');

    act(() => {
      markBackendOnline();
    });
    expect(result.current).toBe('online');

    act(() => {
      markBackendOffline();
    });
    expect(result.current).toBe('offline');
  });
});
