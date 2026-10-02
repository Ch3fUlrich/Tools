import { describe, it, expect, vi } from 'vitest';
import { emptyRow } from '../components/tools/training/useActiveWorkout';

vi.mock('@/lib/api/client', () => ({
  startSession: vi.fn(),
  listSessions: vi.fn(),
  getSession: vi.fn(),
  updateSession: vi.fn(),
  logSet: vi.fn(),
  deleteSet: vi.fn(),
  listPlans: vi.fn(),
  listExercises: vi.fn(),
}));

describe('emptyRow', () => {
  it('should create an empty row with the given exerciseId and setNumber', () => {
    const row = emptyRow('ex-123', 1);
    expect(row).toEqual({
      exerciseId: 'ex-123',
      setNumber: 1,
      weightKg: '',
      reps: '',
      rpe: '',
      isWarmup: false,
      isDropset: false,
      isFailure: false,
      savedId: null,
      saving: false,
      energyKcal: null,
      energyPotentialKcal: null,
      energyKineticKcal: null,
      energyIsometricKcal: null,
    });
  });

  it('should handle different exerciseId and setNumber correctly', () => {
    const row = emptyRow('ex-456', 5);
    expect(row).toMatchObject({
      exerciseId: 'ex-456',
      setNumber: 5,
      weightKg: '',
      reps: '',
    });
  });
});
