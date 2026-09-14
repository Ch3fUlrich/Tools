import { describe, expect, it } from 'vitest';
import { findSubstance } from '../lib/local/substanceDatabase';

describe('findSubstance', () => {
  it('finds a substance by exact id', () => {
    const substance = findSubstance('caffeine');
    expect(substance).toBeDefined();
    expect(substance?.id).toBe('caffeine');
  });

  it('finds a substance by exact name', () => {
    const substance = findSubstance('Caffeine');
    expect(substance).toBeDefined();
    expect(substance?.name).toBe('Caffeine');
  });

  it('finds a substance with case insensitivity for id', () => {
    const substance = findSubstance('cAFFeiNe');
    expect(substance).toBeDefined();
    expect(substance?.id).toBe('caffeine');
  });

  it('returns undefined if substance is not found', () => {
    const substance = findSubstance('nonexistent-substance');
    expect(substance).toBeUndefined();
  });
});
