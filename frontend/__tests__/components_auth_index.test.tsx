// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';
import * as authIndex from '@/components/auth';

describe('components/auth index re-exports', () => {
  test('exports AuthProvider and useAuth', () => {
    expect(authIndex).toHaveProperty('AuthProvider');
    expect(authIndex).toHaveProperty('useAuth');
  });
});
