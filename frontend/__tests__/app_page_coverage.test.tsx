// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import Home from '@/app/page';
import { AuthProvider } from '@/components/auth';

describe('app page coverage', () => {
  test('renders main heading and auth button when unauthenticated', () => {
    render(
      <AuthProvider>
        <Home />
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: /Tools Collection/i })).toBeInTheDocument();
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
  });
});
