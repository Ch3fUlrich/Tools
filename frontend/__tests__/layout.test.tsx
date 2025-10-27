// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

// Mock aliases for single-file runs
vi.mock('@/components/auth', () => ({
  AuthProvider: ({ children }: any) => <div data-testid="auth-provider">{children}</div>,
}));

// Mock global CSS before importing the real layout to avoid PostCSS running in tests
vi.mock('../app/globals.css', () => ({}));
import RootLayout from '../app/layout';

describe('RootLayout', () => {
  test('renders children inside AuthProvider', () => {
    render(
      <RootLayout>
        <div>child-content</div>
      </RootLayout>
    );

    expect(screen.getByText('child-content')).toBeInTheDocument();
  });
});
