import { describe, it, expect } from 'vitest';
import { defaultTempo } from '../lib/local/training';

describe('training utilities', () => {
  describe('defaultTempo', () => {
    it('returns the standard default tempo', () => {
      const tempo = defaultTempo();
      expect(tempo).toEqual({
        eccentricS: 2.0,
        pauseBottomS: 0.0,
        concentricS: 1.0,
        pauseTopS: 0.0,
      });
    });
  });
});
