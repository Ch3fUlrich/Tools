import {
  isBackendOffline,
  markBackendOffline,
  markBackendOnline,
  checkBackend,
} from '@/lib/api/backendStatus';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/** Default request timeout in milliseconds (15 seconds). */
export const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Central fetch wrapper with timeout, consistent error handling, and 401 detection.
 * All public API functions should call this instead of raw `fetch`.
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  errorPrefix: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      // On 401, broadcast so AuthContext can clear state
      if (response.status === 401) {
        try {
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        } catch {
          // SSR / test environment — ignore
        }
      }

      let detail = '';
      try {
        const body = await response.text();
        // Try to extract a JSON error message
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) detail = parsed.error;
          else detail = body;
        } catch {
          detail = body;
        }
      } catch {
        // text() not available (e.g. in test mocks) — try json() directly
        try {
          const data = await response.json();
          if (data?.error) detail = data.error;
        } catch {
          // Cannot read response body at all — ignore
        }
      }

      throw new Error(
        detail
          ? `${errorPrefix} (${response.status}): ${detail}`
          : `${errorPrefix} (${response.status})`,
      );
    }

    // Some endpoints return no body (204, etc.)
    const contentType = response.headers?.get?.('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }
    // Fallback: try parsing as JSON (many test mocks don't set headers)
    if (typeof response.json === 'function') {
      try {
        return (await response.json()) as T;
      } catch {
        // Not JSON — return empty
      }
    }
    return {} as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * True for failures that mean "backend unreachable" (DNS/connection refused/
 * timeout), as opposed to HTTP errors the backend itself produced.
 */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true; // fetch network failure
  return err instanceof Error && err.name === 'AbortError'; // request timeout
}

/**
 * Run a backend call with a client-side fallback.
 *
 * The remote call is attempted first (zero added latency while online). Only a
 * network-level failure switches to the local implementation — HTTP errors
 * (validation, 4xx/5xx) are still surfaced to the caller. Once the backend is
 * known to be offline, the network is skipped entirely for instant local
 * results, while a shared probe periodically checks for recovery.
 */
export async function withLocalFallback<T>(remote: () => Promise<T>, local: () => T): Promise<T> {
  if (isBackendOffline()) {
    void checkBackend(); // cheap: cached + deduplicated, detects recovery
    return local();
  }
  try {
    const result = await remote();
    markBackendOnline();
    return result;
  } catch (err) {
    if (isNetworkError(err)) {
      markBackendOffline();
      return local();
    }
    throw err;
  }
}

/** Shorthand for JSON POST requests with credentials. */
export function jsonPost<T>(path: string, body: unknown, errorPrefix: string): Promise<T> {
  return apiRequest<T>(
    `${API_BASE_URL}${path}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    },
    errorPrefix,
  );
}

/** Shorthand for authenticated GET requests. */
export function authGet<T>(path: string, errorPrefix: string): Promise<T> {
  return apiRequest<T>(
    `${API_BASE_URL}${path}`,
    { credentials: 'include' },
    errorPrefix,
  );
}

/** Shorthand for authenticated PUT requests with JSON body. */
export function authPut<T>(path: string, body: unknown, errorPrefix: string): Promise<T> {
  return apiRequest<T>(
    `${API_BASE_URL}${path}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    },
    errorPrefix,
  );
}

/** Shorthand for authenticated DELETE requests. */
export function authDelete<T>(path: string, errorPrefix: string): Promise<T> {
  return apiRequest<T>(
    `${API_BASE_URL}${path}`,
    { method: 'DELETE', credentials: 'include' },
    errorPrefix,
  );
}
