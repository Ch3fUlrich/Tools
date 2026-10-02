import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useActiveWorkout, emptyRow } from '../components/tools/training/useActiveWorkout';
import * as apiClient from '../lib/api/client';

// Mock the API client
vi.mock('../lib/api/client', () => ({
  startSession: vi.fn(),
  listSessions: vi.fn(),
  getSession: vi.fn(),
  updateSession: vi.fn(),
  logSet: vi.fn(),
  deleteSet: vi.fn(),
  listPlans: vi.fn(),
  listExercises: vi.fn(),
}));

describe('useActiveWorkout', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('emptyRow', () => {
    it('creates an empty set row with defaults', () => {
      const row = emptyRow('ex-1', 1);
      expect(row).toEqual({
        exerciseId: 'ex-1',
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
  });

  describe('hook initialization', () => {
    it('loads plans, exercises and handles empty in-progress sessions', async () => {
      vi.mocked(apiClient.listPlans).mockResolvedValue({ plans: [{ id: 'p1', name: 'Plan 1', description: '', created_at: '', updated_at: '' }] });
      vi.mocked(apiClient.listExercises).mockResolvedValue({ exercises: [{ id: 'ex-1', name: 'Squat', movementPattern: '' }] });
      vi.mocked(apiClient.listSessions).mockResolvedValue({ sessions: [] });

      const { result } = renderHook(() => useActiveWorkout());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.plans.length).toBe(1);
      expect(result.current.exercises.length).toBe(1);
      expect(result.current.session).toBeNull();
      expect(result.current.groups).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles initialization errors', async () => {
      vi.mocked(apiClient.listPlans).mockRejectedValue(new Error('Network error'));
      vi.mocked(apiClient.listExercises).mockResolvedValue({ exercises: [] });
      vi.mocked(apiClient.listSessions).mockResolvedValue({ sessions: [] });

      const { result } = renderHook(() => useActiveWorkout());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('loads an existing in-progress session', async () => {
      vi.mocked(apiClient.listPlans).mockResolvedValue({ plans: [] });
      vi.mocked(apiClient.listExercises).mockResolvedValue({ exercises: [] });

      // Return a session list with one in-progress
      vi.mocked(apiClient.listSessions).mockResolvedValue({
        sessions: [{ id: 's1', name: 'S1', startTime: 't1', status: 'in_progress' }]
      });

      // Return full details when it gets fetched
      vi.mocked(apiClient.getSession).mockResolvedValue({
        id: 's1',
        name: 'S1',
        startTime: 't1',
        status: 'in_progress',
        sets: [
          {
            id: 'set-1',
            sessionId: 's1',
            exerciseId: 'ex-1',
            exerciseName: 'Squat',
            setNumber: 1,
            weightKg: 100,
            reps: 5,
            isWarmup: false,
            isDropset: false,
            isFailure: false,
            loggedAt: 't2',
            energyKcal: null,
            energyPotentialKcal: null,
            energyKineticKcal: null,
            energyIsometricKcal: null,
          }
        ]
      });

      const { result } = renderHook(() => useActiveWorkout());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session?.id).toBe('s1');
      expect(result.current.groups.length).toBe(1);
      expect(result.current.groups[0].exerciseId).toBe('ex-1');
      expect(result.current.groups[0].exerciseName).toBe('Squat');
      expect(result.current.groups[0].sets.length).toBe(1);

      // Verify set row conversion
      const setRow = result.current.groups[0].sets[0];
      expect(setRow.weightKg).toBe('100');
      expect(setRow.reps).toBe('5');
      expect(setRow.savedId).toBe('set-1');
    });
  });
});
