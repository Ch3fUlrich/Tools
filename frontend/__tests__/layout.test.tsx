// @vitest-environment jsdom
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

vi.mock('@/components/auth', () => ({
  AuthProvider: ({ children }: any) => <div data-testid="auth-provider">{children}</div>,
}));

vi.mock('../app/globals.css', () => ({}));
import RootLayout from '../app/layout';

describe('RootLayout', () => {
  test('renders children inside AuthProvider', async () => {
        await act(async () => {
      // Must use document because RootLayout renders <html> and you can't put <html> inside <div>.
      render(
        <RootLayout>
          <div>child-content</div>
        </RootLayout>,
        { container: document }
      );
            await new Promise(r => setTimeout(r, 0));
    });

    expect(screen.getByText('child-content')).toBeInTheDocument();
  });
});
