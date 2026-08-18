import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrainingStore } from '../lib/local/trainingStore';
import { getExerciseLocal } from '../lib/local/training';

vi.mock('../lib/local/training', () => ({
  getExerciseLocal: vi.fn(),
  computeSetEnergyLocal: vi.fn(() => ({
    totalKcal: 5.0,
    potentialKcal: 2.0,
    kineticKcal: 2.0,
    isometricKcal: 1.0,
  })),
}));

describe('TrainingStore', () => {
  let store: TrainingStore;

  beforeEach(async () => {
    store = new TrainingStore();
    await store.init();
  });

  afterEach(async () => {
    // Force close connection if kept open (since there's a cached instance)
    if (store['db']) {
      store['db'].close();
      store['db'] = null;
    }

    // Clear the db completely
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  });

  describe('Measurements', () => {
    it('creates, lists, and deletes measurements', async () => {
      const { id } = await store.createMeasurement({
        measuredAt: '2023-01-01',
        bodyWeightKg: 80,
        heightCm: 180,
      });

      expect(id).toBeDefined();

      let list = await store.listMeasurements();
      expect(list.measurements).toHaveLength(1);
      expect(list.measurements[0].bodyWeightKg).toBe(80);

      const latest = await store.latestMeasurement();
      expect(latest?.id).toBe(id);

      await store.deleteMeasurement(id);

      list = await store.listMeasurements();
      expect(list.measurements).toHaveLength(0);
    });
  });

  describe('Plans', () => {
    it('creates, gets, and deletes plans', async () => {
      const { id } = await store.createPlan({
        name: 'My Plan',
        description: 'Test Plan',
        planType: 'custom',
      });

      expect(id).toBeDefined();

      let plansList = await store.listPlans();
      expect(plansList.plans).toHaveLength(1);
      expect(plansList.plans[0].name).toBe('My Plan');

      const planDetail = await store.getPlan(id);
      expect(planDetail.name).toBe('My Plan');
      expect(planDetail.exercises).toHaveLength(0);

      await store.updatePlan(id, { name: 'Updated Plan' });
      const updatedPlan = await store.getPlan(id);
      expect(updatedPlan.name).toBe('Updated Plan');

      await store.deletePlan(id);
      plansList = await store.listPlans();
      expect(plansList.plans).toHaveLength(0);
    });

    it('throws when getting non-existent plan', async () => {
       await expect(store.getPlan('non-existent')).rejects.toThrow('Plan not found');
    });

    it('adds and deletes plan exercises', async () => {
      // Mock exercise
      (getExerciseLocal as any).mockReturnValue({
        id: 'ex-1',
        name: 'Squat',
        movementPattern: 'squat',
      });

      const { id: planId } = await store.createPlan({ name: 'Plan 1', planType: 'custom' });

      const { id: exId } = await store.addPlanExercise(planId, {
        exerciseId: 'ex-1',
        targetSets: 3,
        targetReps: 10,
      });

      const planDetail = await store.getPlan(planId);
      expect(planDetail.exercises).toHaveLength(1);
      expect(planDetail.exercises[0].exerciseName).toBe('Squat');

      await store.deletePlanExercise(planId, exId);
      const planDetailAfter = await store.getPlan(planId);
      expect(planDetailAfter.exercises).toHaveLength(0);
    });

    it('throws when adding exercise for non-existent exercise id', async () => {
       (getExerciseLocal as any).mockReturnValue(undefined);
       const { id: planId } = await store.createPlan({ name: 'Plan 1', planType: 'custom' });

       await expect(store.addPlanExercise(planId, { exerciseId: 'bad-ex' })).rejects.toThrow('Exercise not found');
    });
  });

  describe('Sessions & Sets', () => {
    it('starts, updates, gets, and deletes sessions and sets', async () => {
      (getExerciseLocal as any).mockReturnValue({
        id: 'ex-1',
        name: 'Squat',
        movementPattern: 'squat',
      });

      const { id: sessionId } = await store.startSession({
        name: 'Session 1',
      });

      let sessionsList = await store.listSessions();
      expect(sessionsList.sessions).toHaveLength(1);

      await store.logSet(sessionId, {
        exerciseId: 'ex-1',
        setNumber: 1,
        weightKg: 100,
        reps: 5,
      });

      let sessionDetail = await store.getSession(sessionId);
      expect(sessionDetail.sets).toHaveLength(1);
      expect(sessionDetail.sets[0].weightKg).toBe(100);

      await store.updateSession(sessionId, { status: 'completed' });
      sessionDetail = await store.getSession(sessionId);
      expect(sessionDetail.status).toBe('completed');
      expect(sessionDetail.completedAt).toBeDefined();
      expect(sessionDetail.totalVolumeKg).toBe(500); // 100 * 5

      await store.deleteSet(sessionId, sessionDetail.sets[0].id);
      sessionDetail = await store.getSession(sessionId);
      expect(sessionDetail.sets).toHaveLength(0);
    });

    it('throws when getting or updating non-existent session', async () => {
        await expect(store.getSession('non-existent')).rejects.toThrow('Session not found');
        await expect(store.updateSession('non-existent', { status: 'completed' })).rejects.toThrow('Session not found');
    });

    it('computes stats correctly', async () => {
      (getExerciseLocal as any).mockReturnValue({
        id: 'ex-1',
        name: 'Squat',
        movementPattern: 'squat',
      });

      const { id: sessionId } = await store.startSession({ name: 'Session Stats' });

      await store.logSet(sessionId, {
        exerciseId: 'ex-1',
        setNumber: 1,
        weightKg: 100,
        reps: 5,
      });

      await store.logSet(sessionId, {
        exerciseId: 'ex-1',
        setNumber: 2,
        weightKg: 100,
        reps: 5,
      });

      const statsVolume = await store.statsVolume();
      expect(statsVolume.data.length).toBe(1);
      expect(statsVolume.data[0].volumeKg).toBe(1000); // 2 sets of 100x5

      const statsEnergy = await store.statsEnergy();
      expect(statsEnergy.data.length).toBe(1);
      expect(statsEnergy.data[0].energyKcal).toBe(10); // 2 sets of 5 kcal (mocked)
    });
  });
});
