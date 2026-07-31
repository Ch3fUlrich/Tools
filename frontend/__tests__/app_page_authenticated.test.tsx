// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

// Mock next/router before importing the page
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Mock the auth module to simulate an authenticated user and provide a simple UserProfile
vi.mock('@/components/auth', () => ({
  useAuth: () => ({ isAuthenticated: true }),
  UserProfile: () => <div>MockUserProfile</div>,
}));

import Home from '@/app/page';
import { TestWrapper } from '@/lib/test-utils';

describe('Home page authenticated branch', () => {
  test('shows UserProfile when authenticated', () => {
    render(<TestWrapper><Home /></TestWrapper>);
    expect(screen.getByText('MockUserProfile')).toBeInTheDocument();
    // Note: Sign In link is always present in header regardless of auth state
  });
});
