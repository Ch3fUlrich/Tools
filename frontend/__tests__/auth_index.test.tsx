import { describe, test, expect } from 'vitest';
import * as auth from '../components/auth';

describe('auth index exports', () => {
  test('exports expected components', () => {
    // Use a static import to avoid dynamic-import timing issues in CI/slow environments
    expect(auth.AuthModal).toBeDefined();
    expect(auth.AuthProvider).toBeDefined();
    expect(auth.useAuth).toBeDefined();
    expect(auth.LoginForm).toBeDefined();
    expect(auth.RegisterForm).toBeDefined();
    expect(auth.ProtectedRoute).toBeDefined();
    expect(auth.UserProfile).toBeDefined();
  });
});