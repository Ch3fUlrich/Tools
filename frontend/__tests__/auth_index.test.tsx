import { describe, test, expect } from 'vitest';

describe('auth index exports', () => {
  test('exports expected components', async () => {
    const auth = await import('../components/auth');
    expect(auth.AuthModal).toBeDefined();
    expect(auth.AuthProvider).toBeDefined();
    expect(auth.useAuth).toBeDefined();
    expect(auth.LoginForm).toBeDefined();
    expect(auth.RegisterForm).toBeDefined();
    expect(auth.ProtectedRoute).toBeDefined();
    expect(auth.UserProfile).toBeDefined();
  });
});