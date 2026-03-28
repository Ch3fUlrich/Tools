// @vitest-environment jsdom
import React from 'react';
import { render } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));

// Mock LoginForm and RegisterForm to capture handlers
vi.mock('@/components/auth', () => ({
  LoginForm: ({ onSuccess, onClose }: any) => {
    // call handlers to ensure they don't throw
    onClose?.();
    onSuccess?.();
    return <div>MockLoginForm</div>;
  },
  RegisterForm: () => <div>MockRegisterForm</div>,
}));

import AuthPage from '@/app/auth/page';

describe('Auth page handlers', () => {
  test('calls close and success handlers without error', () => {
    render(<AuthPage />);
    expect(true).toBeTruthy();
  });
});
