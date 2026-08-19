import { renderHook, act } from '@testing-library/react';
import { useElapsed } from '../hooks/useElapsed';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('useElapsed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string when startedAt is null', () => {
    const { result } = renderHook(() => useElapsed(null));
    expect(result.current).toBe('');
  });

  it('formats correctly under an hour (M:SS)', () => {
    const startedAt = '2023-01-01T12:00:00Z';
    // Mock the current time to be 2 minutes and 30 seconds later
    vi.setSystemTime(new Date('2023-01-01T12:02:30Z'));

    const { result } = renderHook(() => useElapsed(startedAt));
    expect(result.current).toBe('2:30');
  });

  it('formats correctly over an hour (H:MM:SS)', () => {
    const startedAt = '2023-01-01T12:00:00Z';
    // Mock the current time to be 1 hour, 5 minutes, and 45 seconds later
    vi.setSystemTime(new Date('2023-01-01T13:05:45Z'));

    const { result } = renderHook(() => useElapsed(startedAt));
    expect(result.current).toBe('1:05:45');
  });

  it('updates the elapsed time every second', () => {
    const startedAt = '2023-01-01T12:00:00Z';
    vi.setSystemTime(new Date('2023-01-01T12:00:00Z'));

    const { result } = renderHook(() => useElapsed(startedAt));
    expect(result.current).toBe('0:00');

    // Advance time by 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe('0:01');

    // Advance time by 59 seconds to reach 1 minute
    act(() => {
      vi.advanceTimersByTime(59000);
    });
    expect(result.current).toBe('1:00');
  });

  it('handles startedAt changes', () => {
    const time1 = '2023-01-01T12:00:00Z';
    const time2 = '2023-01-01T12:05:00Z';

    vi.setSystemTime(new Date('2023-01-01T12:10:00Z'));

    const { result, rerender } = renderHook(
      ({ startedAt }: { startedAt: string | null }) => useElapsed(startedAt),
      { initialProps: { startedAt: time1 as string | null } }
    );

    // Elapsed since time1 (10 minutes)
    expect(result.current).toBe('10:00');

    // Change to time2 (5 minutes)
    rerender({ startedAt: time2 as string | null });

    expect(result.current).toBe('5:00');

    // Change to null
    rerender({ startedAt: null });
    expect(result.current).toBe('');
  });
});
