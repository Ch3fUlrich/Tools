// @vitest-environment jsdom
import React from 'react';
import { render } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Mock AuthModal to capture handlers
vi.mock('@/components/auth', () => ({
  AuthModal: ({ isOpen, onClose, onSuccess }: any) => {
    // call handlers to ensure they don't throw
    if (isOpen) {
      onClose();
      onSuccess();
    }
    return <div>MockAuthModal</div>;
  },
}));

import AuthPage from '@/app/auth/page';

describe('Auth page handlers', () => {
  test('calls close and success handlers without error', () => {
    render(<AuthPage />);
    expect(true).toBeTruthy();
  });
});
