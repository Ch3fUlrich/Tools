// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';

// Mock next/router
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Mock auth to be unauthenticated; include ProtectedRoute to allow protected branch rendering
vi.mock('@/components/auth', () => ({
  useAuth: () => ({ isAuthenticated: false }),
  ProtectedRoute: ({ children }: any) => <div>{children}</div>,
}));

// Mock the heavy tool components so we just exercise the branch rendering
vi.mock('@/components/tools/FatLossCalculator', () => ({ __esModule: true, default: () => <div>MockFatLoss</div> }));
vi.mock('@/components/tools/N26Analyzer', () => ({ __esModule: true, default: () => <div>MockN26</div> }));

import Home from '@/app/page';

describe('Home page tool interactions', () => {
  test('selects Fat Loss and N26 tools and navigates back', async () => {
    render(<Home />);

    // Ensure the grid and tool titles render
    expect(screen.getByRole('heading', { name: /Tools Collection/i })).toBeInTheDocument();
  const fatBtn = screen.getByRole('button', { name: /Fat Loss Calculator/i });
  // query N26 button later to avoid stale element after navigation
  // const n26Btn = screen.getByRole('button', { name: /N26 Transaction Analyzer/i });

    // Click Fat Loss and expect mocked component
    await userEvent.click(fatBtn);
    expect(await screen.findByText('MockFatLoss')).toBeInTheDocument();

  // Click back to tools
  const backBtn = screen.getByRole('button', { name: /Back to Tools/i });
  await userEvent.click(backBtn);
  expect(screen.getByRole('heading', { name: /Fat Loss Calculator/i })).toBeInTheDocument();

  // Re-query the N26 button (DOM changed) and click it
  const n26BtnNow = screen.getByRole('button', { name: /N26 Transaction Analyzer/i });
  await userEvent.click(n26BtnNow);
  expect(await screen.findByText('MockN26')).toBeInTheDocument();
  });
});
