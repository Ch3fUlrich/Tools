import * as animations from '../lib/animations';
import { interactivePop, subtleFade } from '../lib/animations';
import { describe, it, expect } from 'vitest';

describe('animations', () => {
  it('should export the expected string for interactivePop', () => {
    expect(interactivePop).toBe(
      'transition-transform duration-150 ease-out motion-safe:hover:scale-105 motion-reduce:transition-none'
    );
  });

  it('should export the expected string for subtleFade', () => {
    expect(subtleFade).toBe(
      'transition-opacity duration-200 ease-in-out motion-reduce:transition-none'
    );
  });

  it('should have an object export containing both animations', () => {
    expect(animations.interactivePop).toBe(interactivePop);
    expect(animations.subtleFade).toBe(subtleFade);
  });
});
