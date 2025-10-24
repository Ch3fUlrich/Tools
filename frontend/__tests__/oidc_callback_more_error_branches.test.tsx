// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

// Mock router to capture push
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
// Mock useAuth
vi.mock('@/components/auth', () => ({ useAuth: () => ({ login: vi.fn() }) }));

const originalLocation = global.window.location;
function setSearch(search: string) {
  // @ts-ignore
  delete global.window.location;
  // @ts-ignore
  global.window.location = { search } as Location;
}

import OIDCPage from '@/app/auth/oidc/callback/page';

describe('OIDC callback additional error branches', () => {
  test('shows UI when no code param present', async () => {
    setSearch('?state=abc');
    render(<OIDCPage />);
    expect(await screen.findByText(/Authentication Failed/)).toBeInTheDocument();
    // restore
    // @ts-ignore
    global.window.location = originalLocation;
  });

  test('handles non-ok fetch response and shows parsed error', async () => {
    setSearch('?code=xyz');
    // mock global fetch to return ok: false and error JSON
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'server_error', error_description: 'Oops' }) }));
  render(<OIDCPage />);
  expect(await screen.findByText(/Authentication Failed/)).toBeInTheDocument();
  // the component renders either the error_description or the error code; accept either
  expect(screen.getByText(/server_error|Oops/)).toBeInTheDocument();
    // restore
    // @ts-ignore
    global.window.location = originalLocation;
    // @ts-ignore
    vi.unstubAllGlobals();
  });
});
