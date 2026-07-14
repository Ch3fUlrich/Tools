import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  markBackendOnline,
  markBackendOffline,
  getBackendStatus,
  isBackendOffline,
  subscribeBackendStatus,
  resetBackendStatusForTests,
} from '../lib/api/backendStatus';

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
