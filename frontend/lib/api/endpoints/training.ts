import { jsonPost, authGet, authPut, authDelete } from '../core';
import type {
  CreateMeasurementRequest,
  BodyMeasurement,
  MuscleGroup,
  Exercise,
  TrainingPlan,
  CreatePlanRequest,
  TrainingPlanDetail,
  AddPlanExerciseRequest,
  StartSessionRequest,
  WorkoutSession,
  WorkoutSessionDetail,
  LogSetRequest,
  LogSetResponse,
  EnergyStatsPoint,
  VolumeStatsPoint,
  MuscleEnergyData,
  CalculateEnergyRequest,
  SetEnergyPreview,
  PlateCalculationResult
} from '../../types/api/types';

const T = '/api/tools/training';

// -- Body Measurements --

export async function createMeasurement(req: CreateMeasurementRequest): Promise<{ id: string }> {
  return jsonPost(`${T}/measurements`, req, 'Failed to save measurement');
}

export async function listMeasurements(limit?: number): Promise<{ measurements: BodyMeasurement[] }> {
  const q = limit ? `?limit=${limit}` : '';
  return authGet(`${T}/measurements${q}`, 'Failed to load measurements');
}

export async function latestMeasurement(): Promise<BodyMeasurement | null> {
  try {
    return await authGet<BodyMeasurement>(`${T}/measurements/latest`, 'Failed to load latest measurement');
  } catch {
    return null;
  }
}

export async function deleteMeasurement(id: string): Promise<void> {
  return authDelete(`${T}/measurements/${id}`, 'Failed to delete measurement');
}

// -- Muscle Groups --

export async function listMuscleGroups(): Promise<{ muscles: MuscleGroup[] }> {
  return authGet(`${T}/muscles`, 'Failed to load muscle groups');
}

// -- Exercises --

export async function listExercises(filters?: {
  equipment?: string;
  muscle?: string;
  pattern?: string;
  difficulty?: string;
  search?: string;
}): Promise<{ exercises: Exercise[] }> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  }
  const q = params.toString() ? `?${params}` : '';
  return authGet(`${T}/exercises${q}`, 'Failed to load exercises');
}

export async function getExercise(id: string): Promise<Exercise> {
  return authGet(`${T}/exercises/${id}`, 'Failed to load exercise');
}

// -- Training Plans --

export async function listPlans(): Promise<{ plans: TrainingPlan[] }> {
  return authGet(`${T}/plans`, 'Failed to load plans');
}

export async function createPlan(req: CreatePlanRequest): Promise<{ id: string }> {
  return jsonPost(`${T}/plans`, req, 'Failed to create plan');
}

export async function getPlan(id: string): Promise<TrainingPlanDetail> {
  return authGet(`${T}/plans/${id}`, 'Failed to load plan');
}

export async function updatePlan(id: string, data: Partial<CreatePlanRequest> & { isActive?: boolean; sortOrder?: number }): Promise<void> {
  return authPut(`${T}/plans/${id}`, data, 'Failed to update plan');
}

export async function deletePlan(id: string): Promise<void> {
  return authDelete(`${T}/plans/${id}`, 'Failed to delete plan');
}

export async function addPlanExercise(planId: string, req: AddPlanExerciseRequest): Promise<{ id: string }> {
  return jsonPost(`${T}/plans/${planId}/exercises`, req, 'Failed to add exercise to plan');
}

export async function deletePlanExercise(planId: string, id: string): Promise<void> {
  return authDelete(`${T}/plans/${planId}/exercises/${id}`, 'Failed to remove exercise from plan');
}

// -- Workout Sessions --

export async function startSession(req: StartSessionRequest): Promise<{ id: string }> {
  return jsonPost(`${T}/sessions`, req, 'Failed to start session');
}

export async function listSessions(filters?: {
  from?: string;
  to?: string;
  planId?: string;
  status?: string;
}): Promise<{ sessions: WorkoutSession[] }> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  }
  const q = params.toString() ? `?${params}` : '';
  return authGet(`${T}/sessions${q}`, 'Failed to load sessions');
}

export async function getSession(id: string): Promise<WorkoutSessionDetail> {
  return authGet(`${T}/sessions/${id}`, 'Failed to load session');
}

export async function updateSession(id: string, data: { status?: string; notes?: string }): Promise<void> {
  return authPut(`${T}/sessions/${id}`, data, 'Failed to update session');
}

export async function logSet(sessionId: string, req: LogSetRequest): Promise<LogSetResponse> {
  return jsonPost(`${T}/sessions/${sessionId}/sets`, req, 'Failed to log set');
}

export async function deleteSet(sessionId: string, setId: string): Promise<void> {
  return authDelete(`${T}/sessions/${sessionId}/sets/${setId}`, 'Failed to delete set');
}

// -- Stats --

export async function statsEnergy(filters?: {
  from?: string;
  to?: string;
  planId?: string;
  exerciseId?: string;
}): Promise<{ data: EnergyStatsPoint[] }> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  }
  const q = params.toString() ? `?${params}` : '';
  return authGet(`${T}/stats/energy${q}`, 'Failed to load energy stats');
}

export async function statsVolume(filters?: {
  from?: string;
  to?: string;
  planId?: string;
  exerciseId?: string;
}): Promise<{ data: VolumeStatsPoint[] }> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  }
  const q = params.toString() ? `?${params}` : '';
  return authGet(`${T}/stats/volume${q}`, 'Failed to load volume stats');
}

export async function statsMuscleEnergy(filters?: {
  from?: string;
  to?: string;
  planId?: string;
  exerciseId?: string;
}): Promise<{ data: MuscleEnergyData[] }> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  }
  const q = params.toString() ? `?${params}` : '';
  return authGet(`${T}/stats/muscle-energy${q}`, 'Failed to load muscle energy stats');
}

// -- Utilities --

export async function calculateEnergy(req: CalculateEnergyRequest): Promise<SetEnergyPreview> {
  return jsonPost(`${T}/calculate-energy`, req, 'Failed to calculate energy');
}

export async function calculatePlates(totalWeightKg: number): Promise<PlateCalculationResult> {
  return jsonPost(`${T}/calculate-plates`, { totalWeightKg }, 'Failed to calculate plates');
}
