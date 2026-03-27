import { describe, it, expect } from 'vitest';
import { getToleranceSubstances } from '@/lib/api/client';

describe('API Client - getToleranceSubstances', () => {
  it('should return mocked substances data', async () => {
    const substances = await getToleranceSubstances();
    expect(substances).toBeDefined();
    expect(Array.isArray(substances)).toBe(true);
    expect(substances.length).toBeGreaterThan(0);
    expect(substances[0]).toHaveProperty('id');
    expect(substances[0]).toHaveProperty('name');
    console.log('Substances:', substances);
  });
});