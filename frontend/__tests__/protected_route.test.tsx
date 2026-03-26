// Mock router before importing modules so they're wired correctly
let mockPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

// Provide a mutable mock object for AuthContext's useAuth
const authState = { isAuthenticated: false, isLoading: false } as any;
vi.mock('@/components/auth/AuthContext', () => ({
  useAuth: () => authState,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { TestWrapper } from '@/lib/test-utils';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // reset the push spy reference used in the mocked module
    mockPush = vi.fn();
  });

  test('redirects unauthenticated user', async () => {
    authState.isAuthenticated = false;
    authState.isLoading = false;

    render(<TestWrapper><ProtectedRoute><div>Secret</div></ProtectedRoute></TestWrapper>);

    await waitFor(() => expect(mockPush).toHaveBeenCalled());
  });

  test('renders children when authenticated', () => {
    authState.isAuthenticated = true;
    authState.isLoading = false;

    render(<TestWrapper><ProtectedRoute><div>Secret</div></ProtectedRoute></TestWrapper>);
    expect(screen.getByText('Secret')).toBeInTheDocument();
  });
});
