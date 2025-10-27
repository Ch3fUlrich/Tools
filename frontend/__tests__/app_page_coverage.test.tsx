// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import Home from '@/app/page';
import { AuthProvider } from '@/components/auth';
import Header from '@/components/layout/Header';

describe('app page coverage', () => {
  test('renders main heading and auth button when unauthenticated', () => {
    render(
      <AuthProvider>
        <Header />
        <Home />
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: /Tools Collection/i })).toBeInTheDocument();
  // Header provides the Sign In link/button (desktop + mobile variants may both be present)
  expect(screen.getAllByText(/Sign In/i).length).toBeGreaterThan(0);
  });
});
