// @vitest-environment jsdom
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/' }));

vi.mock('@/components/auth/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn() }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/auth', () => ({ useAuth: () => ({ login: vi.fn() }) }));

const originalLocation = global.window.location;

function setSearch(search: string) {
  // @ts-ignore
  delete global.window.location;
  // @ts-ignore
  global.window.location = { search } as Location;
}

import OIDCPage from '@/app/auth/oidc/callback/page';

describe('OIDC callback error fallback', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    push.mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    // @ts-ignore
    global.window.location = originalLocation;
  });

  test('handles unexpected error without error.message gracefully', async () => {
    setSearch('?code=xyz');
    // Mock fetch to throw a non-Error object
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('Unknown error string'));

    render(<OIDCPage />);

    // Check that it falls back to the generic message
    expect(await screen.findByText(/Authentication Failed/)).toBeInTheDocument();
    expect(screen.getByText('OIDC authentication failed')).toBeInTheDocument();

    // Check that Try Again button works
    const tryAgainBtn = screen.getByText('Try Again');
    fireEvent.click(tryAgainBtn);
    expect(push).toHaveBeenCalledWith('/auth');

    push.mockClear();

    // Fast-forward to trigger the setTimeout redirection
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(push).toHaveBeenCalledWith('/auth');

    // @ts-ignore
    vi.unstubAllGlobals();
  });
});
