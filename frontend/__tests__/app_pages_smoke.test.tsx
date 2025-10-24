// Mock router before importing pages that call useRouter
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import React from 'react';
import { render, screen } from '@testing-library/react';

import Home from '@/app/page';
import AuthPage from '@/app/auth/page';
import { AuthProvider } from '@/components/auth';

describe('App pages smoke tests', () => {
  test('Home page renders Tools Collection heading', () => {
    render(
      <AuthProvider>
        <Home />
      </AuthProvider>
    );
    // The main heading is an accessible heading element
    expect(screen.getByRole('heading', { name: /Tools Collection/i })).toBeInTheDocument();
  // Check for tool names to cover more rendering (match current UI)
  expect(screen.getByText('Fat Loss Calculator')).toBeInTheDocument();
  // Dice Roller was removed from the home grid; assert N26 tool full title
  expect(screen.getByText('N26 Transaction Analyzer')).toBeInTheDocument();
  });

  test('Auth page renders AuthModal', () => {
    render(<AuthPage />);
    expect(screen.getByText(/Welcome Back|Create Account/i)).toBeTruthy();
  });
});
