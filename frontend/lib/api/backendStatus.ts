// Shared backend availability tracker.
//
// One health probe is shared by the whole app (banner, API client). Tool calls
// stay optimistic — they hit the backend directly and only consult this module
// after a network-level failure — so the online path adds zero latency.
// Once the backend is known to be offline, calls skip the network entirely and
// compute locally, while periodic re-probes detect recovery.
import { useSyncExternalStore } from 'react';

export type BackendStatus = 'unknown' | 'online' | 'offline';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/** Health probe timeout — keep short so offline detection feels instant. */
const PROBE_TIMEOUT_MS = 3_000;
/** While online, trust the last probe for this long. */
const ONLINE_RECHECK_MS = 5 * 60_000;
/** While offline, re-probe more eagerly so recovery is picked up quickly. */
const OFFLINE_RECHECK_MS = 15_000;

let status: BackendStatus = 'unknown';
let lastProbeAt = 0;
let inflight: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

function setStatus(next: BackendStatus): void {
  lastProbeAt = Date.now();
  if (status === next) return;
  status = next;
  listeners.forEach((listener) => listener());
}

export function getBackendStatus(): BackendStatus {
  return status;
}

export function isBackendOffline(): boolean {
  return status === 'offline';
}

export function subscribeBackendStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Mark offline immediately (called when a real API call hits a network error). */
export function markBackendOffline(): void {
  setStatus('offline');
}

/** Mark online (called when any real API call succeeds). */
export function markBackendOnline(): void {
  setStatus('online');
}

async function probe(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Check backend availability. Results are cached (shorter TTL while offline)
 * and concurrent calls share a single in-flight probe.
 */
export function checkBackend(force = false): Promise<boolean> {
  if (inflight) return inflight;

  const ttl = status === 'offline' ? OFFLINE_RECHECK_MS : ONLINE_RECHECK_MS;
  if (!force && status !== 'unknown' && Date.now() - lastProbeAt < ttl) {
    return Promise.resolve(status === 'online');
  }

  inflight = probe()
    .then((ok) => {
      setStatus(ok ? 'online' : 'offline');
      return ok;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Test-only helper: reset module state between test cases. */
export function resetBackendStatusForTests(): void {
  status = 'unknown';
  lastProbeAt = 0;
  inflight = null;
}

/** React hook — re-renders when backend availability changes. */
export function useBackendStatus(): BackendStatus {
  return useSyncExternalStore(
    subscribeBackendStatus,
    getBackendStatus,
    () => 'unknown' as BackendStatus,
  );
}
