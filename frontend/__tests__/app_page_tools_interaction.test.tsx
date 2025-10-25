// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
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
  test('home page exposes links to per-tool pages', async () => {
    render(<Home />);

    // Ensure the grid and tool titles render
    expect(screen.getByRole('heading', { name: /Tools Collection/i })).toBeInTheDocument();

    // Each tool should be a link to its route
    const fatLink = screen.getByRole('link', { name: /Fat Loss Calculator/i });
    const n26Link = screen.getByRole('link', { name: /N26 Transaction Analyzer/i });
    const diceLink = screen.getByRole('link', { name: /Dice Roller/i });

    expect(fatLink).toHaveAttribute('href', '/tools/fat-loss');
    expect(n26Link).toHaveAttribute('href', '/tools/n26');
    expect(diceLink).toHaveAttribute('href', '/tools/dice');
  });
});
