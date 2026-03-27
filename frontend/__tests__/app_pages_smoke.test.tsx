// Mock router before importing pages that call useRouter
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import React from 'react';
import { render, screen, within } from '@testing-library/react';

import Home from '@/app/page';
import AuthPage from '@/app/auth/page';
import { TestWrapper } from '@/lib/test-utils';

describe('App pages smoke tests', () => {
  test('Home page renders Tools Collection heading', () => {
    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    );
    // The main heading is an accessible heading element
    expect(screen.getByRole('heading', { name: /Tools Collection/i })).toBeInTheDocument();
  // Check for tool names to cover more rendering (match current UI) - look in main content, not header
  const main = screen.getByRole('main');
  expect(within(main).getByText('Fat Loss Calculator')).toBeInTheDocument();
  // Dice Roller was removed from the home grid; assert N26 tool full title
  expect(within(main).getByText('N26 Transaction Analyzer')).toBeInTheDocument();
  });

  test('Auth page renders AuthModal', () => {
    render(<TestWrapper><AuthPage /></TestWrapper>);
    // Look for text that's unique to the login form in the modal
    expect(screen.getByText('Sign in to your account to continue')).toBeInTheDocument();
  });
});
