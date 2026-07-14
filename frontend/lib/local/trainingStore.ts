import {
  BodyMeasurement,
  CreateMeasurementRequest,
  TrainingPlan,
  PlanExercise,
  TrainingPlanDetail,
  CreatePlanRequest,
  AddPlanExerciseRequest,
  WorkoutSession,
  WorkoutSet,
  WorkoutSessionDetail,
  StartSessionRequest,
  LogSetRequest,
  LogSetResponse,
} from '../api/client';
/* global IDBDatabase, indexedDB, IDBOpenDBRequest, crypto, IDBKeyRange, IDBRequest */
import { getExerciseLocal, computeSetEnergyLocal } from './training';

const DB_NAME = 'ToolsTrainingDB';
const DB_VERSION = 1;

export class TrainingStore {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('measurements')) {
          const store = db.createObjectStore('measurements', { keyPath: 'id' });
          store.createIndex('measuredAt', 'measuredAt', { unique: false });
        }
        if (!db.objectStoreNames.contains('plans')) {
          db.createObjectStore('plans', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('planExercises')) {
          const store = db.createObjectStore('planExercises', { keyPath: 'id' });
          store.createIndex('planId', 'planId', { unique: false });
        }
        if (!db.objectStoreNames.contains('sessions')) {
          const store = db.createObjectStore('sessions', { keyPath: 'id' });
          store.createIndex('startedAt', 'startedAt', { unique: false });
          store.createIndex('planId', 'planId', { unique: false });
        }
        if (!db.objectStoreNames.contains('sets')) {
          const store = db.createObjectStore('sets', { keyPath: 'id' });
          store.createIndex('sessionId', 'sessionId', { unique: false });
        }
      };
    });
  }

  private uuid(): string {
    return crypto.randomUUID();
  }

  // Helper for querying
  private async getAll<T>(storeName: string, indexName?: string, indexValue?: string | IDBKeyRange): Promise<T[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      let request: IDBRequest;

      if (indexName && indexValue !== undefined) {
        const index = store.index(indexName);
        request = index.getAll(indexValue);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async get<T>(storeName: string, id: string): Promise<T | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async put(storeName: string, item: unknown): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async delete(storeName: string, id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Measurements ---

  async createMeasurement(req: CreateMeasurementRequest): Promise<{ id: string }> {
    const id = this.uuid();
    const measurement: BodyMeasurement = {
      id,
      measuredAt: req.measuredAt || new Date().toISOString(),
      bodyWeightKg: req.bodyWeightKg,
      heightCm: req.heightCm ?? null,
      legLengthCm: req.legLengthCm ?? null,
      upperLegLengthCm: req.upperLegLengthCm ?? null,
      lowerLegLengthCm: req.lowerLegLengthCm ?? null,
      armLengthCm: req.armLengthCm ?? null,
      upperArmLengthCm: req.upperArmLengthCm ?? null,
      lowerArmLengthCm: req.lowerArmLengthCm ?? null,
      torsoLengthCm: req.torsoLengthCm ?? null,
      shoulderWidthCm: req.shoulderWidthCm ?? null,
    };
    await this.put('measurements', measurement);
    return { id };
  }

  async listMeasurements(limit?: number): Promise<{ measurements: BodyMeasurement[] }> {
    const all = await this.getAll<BodyMeasurement>('measurements');
    all.sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
    return { measurements: limit ? all.slice(0, limit) : all };
  }

  async latestMeasurement(): Promise<BodyMeasurement | null> {
    const res = await this.listMeasurements(1);
    return res.measurements[0] || null;
  }

  async deleteMeasurement(id: string): Promise<void> {
    await this.delete('measurements', id);
  }

  // --- Plans ---

  async listPlans(): Promise<{ plans: TrainingPlan[] }> {
    const all = await this.getAll<TrainingPlan>('plans');
    all.sort((a, b) => a.sortOrder - b.sortOrder);
    return { plans: all };
  }

  async createPlan(req: CreatePlanRequest): Promise<{ id: string }> {
    const id = this.uuid();
    const plan: TrainingPlan = {
      id,
      name: req.name,
      description: req.description || null,
      planType: req.planType || 'custom',
      isActive: true,
      sortOrder: Date.now(),
    };
    await this.put('plans', plan);
    return { id };
  }

  async getPlan(id: string): Promise<TrainingPlanDetail> {
    const plan = await this.get<TrainingPlan>('plans', id);
    if (!plan) throw new Error('Plan not found');
    const exercises = await this.getAll<PlanExercise & { planId: string }>('planExercises', 'planId', id);
    exercises.sort((a, b) => a.sortOrder - b.sortOrder);
    return { ...plan, exercises };
  }

  async updatePlan(id: string, data: Partial<CreatePlanRequest> & { isActive?: boolean; sortOrder?: number }): Promise<void> {
    const plan = await this.get<TrainingPlan>('plans', id);
    if (!plan) throw new Error('Plan not found');
    await this.put('plans', { ...plan, ...data });
  }

  async deletePlan(id: string): Promise<void> {
    await this.delete('plans', id);
  }

  async addPlanExercise(planId: string, req: AddPlanExerciseRequest): Promise<{ id: string }> {
    const id = this.uuid();
    const ex = getExerciseLocal(req.exerciseId);
    if (!ex) throw new Error('Exercise not found');
    
    const pEx = {
      id,
      planId,
      exerciseId: req.exerciseId,
      exerciseName: ex.name,
      sortOrder: req.sortOrder || Date.now(),
      targetSets: req.targetSets || 3,
      targetReps: req.targetReps || 10,
      targetWeightKg: req.targetWeightKg ? String(req.targetWeightKg) : null,
      targetRpe: req.targetRpe ? String(req.targetRpe) : null,
      restSeconds: req.restSeconds || 90,
      supersetGroup: req.supersetGroup || null,
      notes: req.notes || null,
    };
    await this.put('planExercises', pEx);
    return { id };
  }

  async deletePlanExercise(planId: string, id: string): Promise<void> {
    await this.delete('planExercises', id);
  }

  // --- Sessions ---

  async startSession(req: StartSessionRequest): Promise<{ id: string }> {
    const id = this.uuid();
    const session: WorkoutSession = {
      id,
      planId: req.planId || null,
      name: req.name,
      startedAt: new Date().toISOString(),
      completedAt: null,
      status: 'active',
      notes: null,
      totalEnergyKcal: null,
      totalVolumeKg: null,
    };
    await this.put('sessions', session);
    return { id };
  }

  async listSessions(filters?: { from?: string; to?: string; planId?: string; status?: string }): Promise<{ sessions: WorkoutSession[] }> {
    let all = await this.getAll<WorkoutSession>('sessions');
    if (filters?.planId) all = all.filter(s => s.planId === filters.planId);
    if (filters?.status) all = all.filter(s => s.status === filters.status);
    if (filters?.from) {
      const fromD = new Date(filters.from).getTime();
      all = all.filter(s => new Date(s.startedAt).getTime() >= fromD);
    }
    if (filters?.to) {
      const toD = new Date(filters.to).getTime();
      all = all.filter(s => new Date(s.startedAt).getTime() <= toD);
    }
    all.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    return { sessions: all };
  }

  async getSession(id: string): Promise<WorkoutSessionDetail> {
    const session = await this.get<WorkoutSession>('sessions', id);
    if (!session) throw new Error('Session not found');
    const sets = await this.getAll<WorkoutSet & { sessionId: string }>('sets', 'sessionId', id);
    sets.sort((a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime());
    return { ...session, sets };
  }

  async updateSession(id: string, data: { status?: string; notes?: string }): Promise<void> {
    const session = await this.get<WorkoutSession>('sessions', id);
    if (!session) throw new Error('Session not found');
    
    const toUpdate = { ...session, ...data };
    if (data.status === 'completed' && session.status !== 'completed') {
      toUpdate.completedAt = new Date().toISOString();
      // recalculate total energy
      const sets = await this.getAll<WorkoutSet & { sessionId: string }>('sets', 'sessionId', id);
      toUpdate.totalEnergyKcal = sets.reduce((acc, s) => acc + (s.energyKcal || 0), 0);
      toUpdate.totalVolumeKg = sets.reduce((acc, s) => acc + (s.weightKg * s.reps), 0);
    }
    
    await this.put('sessions', toUpdate);
  }

  async logSet(sessionId: string, req: LogSetRequest): Promise<LogSetResponse> {
    const id = this.uuid();
    const ex = getExerciseLocal(req.exerciseId);
    if (!ex) throw new Error('Exercise not found');

    const m = await this.latestMeasurement();
    const defaultM: BodyMeasurement = {
        id: '', measuredAt: '', bodyWeightKg: 80, heightCm: 175,
        legLengthCm: null, upperLegLengthCm: null, lowerLegLengthCm: null,
        armLengthCm: null, upperArmLengthCm: null, lowerArmLengthCm: null,
        torsoLengthCm: null, shoulderWidthCm: null
    };
    const measurements = m || defaultM;

    const tempo = {
      eccentricS: req.tempoEccentricS ?? 2.0,
      pauseBottomS: req.tempoPauseBottomS ?? 0.0,
      concentricS: req.tempoConcentricS ?? 1.0,
      pauseTopS: req.tempoPauseTopS ?? 0.0,
    };

    const energy = computeSetEnergyLocal({
      weightKg: req.weightKg,
      reps: req.reps,
      movementPattern: ex.movementPattern,
      primarySegmentsMoved: ex.muscles?.map(m => m.muscleName) || [], // Approximation for segments
      romDegrees: ex.romDegrees,
      isBodyweight: ex.isBodyweight,
      isUnilateral: ex.isUnilateral,
      bodyMassFractionMoved: (ex.metadata as Record<string, unknown>)?.bodyMassFractionMoved as number || 0.6,
      measurements: measurements,
      tempo,
    });

    const set: WorkoutSet & { sessionId: string } = {
      id,
      sessionId,
      exerciseId: req.exerciseId,
      exerciseName: ex.name,
      setNumber: req.setNumber,
      weightKg: req.weightKg,
      reps: req.reps,
      rpe: req.rpe || null,
      tempoEccentricS: tempo.eccentricS,
      tempoPauseBottomS: tempo.pauseBottomS,
      tempoConcentricS: tempo.concentricS,
      tempoPauseTopS: tempo.pauseTopS,
      isWarmup: req.isWarmup || false,
      isDropset: req.isDropset || false,
      isFailure: req.isFailure || false,
      restAfterSeconds: req.restAfterSeconds || null,
      energyKcal: energy.totalKcal,
      energyPotentialKcal: energy.potentialKcal,
      energyKineticKcal: energy.kineticKcal,
      energyIsometricKcal: energy.isometricKcal,
      notes: req.notes || null,
      performedAt: new Date().toISOString(),
    };

    await this.put('sets', set);

    return {
      id,
      energyKcal: energy.totalKcal,
      energyPotentialKcal: energy.potentialKcal,
      energyKineticKcal: energy.kineticKcal,
      energyIsometricKcal: energy.isometricKcal,
    };
  }

  async deleteSet(sessionId: string, setId: string): Promise<void> {
    await this.delete('sets', setId);
  }

  // --- Stats ---

  async statsEnergy(filters?: { from?: string; to?: string; planId?: string; exerciseId?: string }): Promise<{ data: Array<{ date: string; energyKcal: number }> }> {
    const sessions = (await this.listSessions(filters)).sessions;
    const sessionIds = new Set(sessions.map(s => s.id));
    
    let allSets = await this.getAll<WorkoutSet & { sessionId: string }>('sets');
    allSets = allSets.filter(s => sessionIds.has(s.sessionId));
    
    if (filters?.exerciseId) {
        allSets = allSets.filter(s => s.exerciseId === filters.exerciseId);
    }

    const dataByDate: Record<string, number> = {};
    for (const s of allSets) {
        const date = new Date(s.performedAt).toISOString().split('T')[0];
        dataByDate[date] = (dataByDate[date] || 0) + (s.energyKcal || 0);
    }

    const data = Object.keys(dataByDate).sort().map(date => ({
        date,
        energyKcal: dataByDate[date]
    }));

    return { data };
  }

  async statsVolume(filters?: { from?: string; to?: string; planId?: string; exerciseId?: string }): Promise<{ data: Array<{ date: string; volumeKg: number }> }> {
    const sessions = (await this.listSessions(filters)).sessions;
    const sessionIds = new Set(sessions.map(s => s.id));
    
    let allSets = await this.getAll<WorkoutSet & { sessionId: string }>('sets');
    allSets = allSets.filter(s => sessionIds.has(s.sessionId));
    
    if (filters?.exerciseId) {
        allSets = allSets.filter(s => s.exerciseId === filters.exerciseId);
    }

    const dataByDate: Record<string, number> = {};
    for (const s of allSets) {
        const date = new Date(s.performedAt).toISOString().split('T')[0];
        dataByDate[date] = (dataByDate[date] || 0) + (s.weightKg * s.reps);
    }

    const data = Object.keys(dataByDate).sort().map(date => ({
        date,
        volumeKg: dataByDate[date]
    }));

    return { data };
  }
}

export const trainingStore = new TrainingStore();
