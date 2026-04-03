// Use named exports for all API functions to keep imports consistent across the codebase.
// Use a relative default so tests and client-side code that expect
// relative API paths don't attempt to call an absolute localhost URL.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/** Default request timeout in milliseconds (15 seconds). */
const DEFAULT_TIMEOUT_MS = 15_000;

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Central fetch wrapper with timeout, consistent error handling, and 401 detection.
 * All public API functions should call this instead of raw `fetch`.
 */
async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  errorPrefix: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      // On 401, broadcast so AuthContext can clear state
      if (response.status === 401) {
        try {
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        } catch {
          // SSR / test environment — ignore
        }
      }

      let detail = '';
      try {
        const body = await response.text();
        // Try to extract a JSON error message
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) detail = parsed.error;
          else detail = body;
        } catch {
          detail = body;
        }
      } catch {
        // text() not available (e.g. in test mocks) — try json() directly
        try {
          const data = await response.json();
          if (data?.error) detail = data.error;
        } catch {
          // Cannot read response body at all — ignore
        }
      }

      throw new Error(
        detail
          ? `${errorPrefix} (${response.status}): ${detail}`
          : `${errorPrefix} (${response.status})`,
      );
    }

    // Some endpoints return no body (204, etc.)
    const contentType = response.headers?.get?.('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }
    // Fallback: try parsing as JSON (many test mocks don't set headers)
    if (typeof response.json === 'function') {
      try {
        return (await response.json()) as T;
      } catch {
        // Not JSON — return empty
      }
    }
    return {} as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Shorthand for JSON POST requests with credentials. */
function jsonPost<T>(path: string, body: unknown, errorPrefix: string): Promise<T> {
  return apiRequest<T>(
    `${API_BASE_URL}${path}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    },
    errorPrefix,
  );
}

/** Shorthand for authenticated GET requests. */
function authGet<T>(path: string, errorPrefix: string): Promise<T> {
  return apiRequest<T>(
    `${API_BASE_URL}${path}`,
    { credentials: 'include' },
    errorPrefix,
  );
}

/** Shorthand for authenticated PUT requests with JSON body. */
function authPut<T>(path: string, body: unknown, errorPrefix: string): Promise<T> {
  return apiRequest<T>(
    `${API_BASE_URL}${path}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    },
    errorPrefix,
  );
}

/** Shorthand for authenticated DELETE requests. */
function authDelete<T>(path: string, errorPrefix: string): Promise<T> {
  return apiRequest<T>(
    `${API_BASE_URL}${path}`,
    { method: 'DELETE', credentials: 'include' },
    errorPrefix,
  );
}

// ─── Dice ────────────────────────────────────────────────────────────────────

export interface RollDicePayload {
  die: { type: string; sides?: number };
  count: number;
  advantage?: 'none' | 'adv' | 'dis';
}

export async function rollDice(payload: RollDicePayload) {
  return apiRequest(
    `${API_BASE_URL}/api/tools/dice/roll`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Roll API error',
  );
}

// ─── Fat Loss ────────────────────────────────────────────────────────────────

export interface FatLossRequest {
  kcal_deficit: number;
  weight_loss_kg: number;
}

export interface FatLossResponse {
  fat_loss_percentage: number | null;
  muscle_loss_percentage: number | null;
  is_valid: boolean;
}

export async function calculateFatLoss(
  request: FatLossRequest,
): Promise<FatLossResponse> {
  return apiRequest<FatLossResponse>(
    `${API_BASE_URL}/api/tools/fat-loss`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    'Failed to calculate fat loss',
  );
}

// ─── N26 Analyzer ────────────────────────────────────────────────────────────

export interface Transaction {
  amount: number;
  date: string;
  category: string;
  comment: string;
}

export interface AnalysisResult {
  transactions: Transaction[];
  category_totals: Record<string, number>;
  overall_total: number;
}

export async function analyzeN26Data(data: Record<string, unknown>): Promise<AnalysisResult> {
  return apiRequest<AnalysisResult>(
    `${API_BASE_URL}/api/tools/n26-analyzer`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    'Failed to analyze N26 data',
  );
}

// ─── Authentication ──────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  display_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  id?: string;
  ok?: boolean;
  error?: string;
}

export async function registerUser(request: RegisterRequest): Promise<AuthResponse> {
  return jsonPost<AuthResponse>('/api/auth/register', request, 'Registration failed');
}

export async function loginUser(request: LoginRequest): Promise<AuthResponse> {
  return jsonPost<AuthResponse>('/api/auth/login', request, 'Login failed');
}

export async function logoutUser(): Promise<AuthResponse> {
  return apiRequest<AuthResponse>(
    `${API_BASE_URL}/api/auth/logout`,
    { method: 'POST', credentials: 'include' },
    'Logout failed',
  );
}

export interface UserProfileResponse {
  id: string;
  email: string;
  display_name?: string;
  created_at: string;
}

export async function getUserProfile(): Promise<UserProfileResponse> {
  return authGet<UserProfileResponse>('/api/auth/me', 'Failed to get profile');
}

export async function updateUserProfile(display_name: string): Promise<void> {
  return apiRequest<void>(
    `${API_BASE_URL}/api/auth/profile`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ display_name }),
    },
    'Failed to update profile',
  );
}

export async function startOIDCLogin(): Promise<void> {
  // Redirect to OIDC start endpoint
  window.location.href = `${API_BASE_URL}/api/auth/oidc/start`;
}

export interface OIDCCallbackRequest {
  code: string;
  state?: string;
}

export interface OIDCCallbackResponse {
  user: {
    id: string;
    email: string;
    created_at: string;
  };
}

export async function handleOIDCCallback(request: OIDCCallbackRequest): Promise<OIDCCallbackResponse> {
  return jsonPost<OIDCCallbackResponse>('/api/auth/oidc/callback', request, 'OIDC callback failed');
}

// ─── Blood Level / Tolerance ─────────────────────────────────────────────────

export interface Substance {
  id: string;
  name: string;
  halfLifeHours: number;
  description?: string;
  category?: string;
  commonDosageMg?: number;
  maxDailyDoseMg?: number;
  eliminationRoute?: string;
  bioavailabilityPercent?: number;
}

export interface SubstanceIntakeRequest {
  substance: string;
  time: string;
  intake_type: string;
  time_after_meal: number | null;
  dosage_mg: number;
}

export interface ToleranceCalculationRequest {
  intakes: SubstanceIntakeRequest[];
  time_points: string[];
}

export interface BloodLevelPoint {
  time: string;
  substance: string;
  amount_mg: number;
  /** @deprecated use amount_mg */
  amountMg?: number;
}

export interface ToleranceCalculationResponse {
  blood_levels: BloodLevelPoint[];
}

export async function getToleranceSubstances(): Promise<Substance[]> {
  return apiRequest<Substance[]>(
    `${API_BASE_URL}/api/tools/bloodlevel/substances`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    'Failed to get substances',
  );
}

export async function calculateTolerance(
  request: ToleranceCalculationRequest,
): Promise<ToleranceCalculationResponse> {
  return apiRequest<ToleranceCalculationResponse>(
    `${API_BASE_URL}/api/tools/bloodlevel/calculate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    'Failed to calculate tolerance',
  );
}

// ─── Dice History ────────────────────────────────────────────────────────────

export interface DiceHistoryEntry {
  id?: string;
  payload: unknown;
  created_at: string;
}

export async function saveDiceRoll(payload: unknown): Promise<void> {
  try {
    await jsonPost<void>('/api/tools/dice/save', { payload }, 'Save dice roll failed');
  } catch {
    // Best-effort: silently ignore save failures
  }
}

export async function getDiceHistory(): Promise<DiceHistoryEntry[]> {
  return authGet<DiceHistoryEntry[]>('/api/tools/dice/history', 'History fetch failed');
}

// ─── Training Tracker ─────────────────────────────────────────────────────────

const T = '/api/tools/training';

// -- Interfaces --

export interface BodyMeasurement {
  id: string;
  measuredAt: string;
  bodyWeightKg: number;
  heightCm: number | null;
  legLengthCm: number | null;
  upperLegLengthCm: number | null;
  lowerLegLengthCm: number | null;
  armLengthCm: number | null;
  upperArmLengthCm: number | null;
  lowerArmLengthCm: number | null;
  torsoLengthCm: number | null;
  shoulderWidthCm: number | null;
}

export interface CreateMeasurementRequest {
  bodyWeightKg: number;
  heightCm?: number;
  legLengthCm?: number;
  upperLegLengthCm?: number;
  lowerLegLengthCm?: number;
  armLengthCm?: number;
  upperArmLengthCm?: number;
  lowerArmLengthCm?: number;
  torsoLengthCm?: number;
  shoulderWidthCm?: number;
  measuredAt?: string;
}

export interface MuscleGroup {
  id: string;
  name: string;
  displayName: string;
  relativeSize: number;
  bodyMapPosition: string;
  svgRegionId: string;
}

export interface ExerciseMuscle {
  muscleGroupId: string;
  muscleName: string;
  involvement: string;
  activationFraction: number;
}

export interface ExerciseMetadata {
  instructions?: string[];
  tips?: string[];
  common_mistakes?: string[];
  video_url?: string | null;
}

export interface Exercise {
  id: string;
  name: string;
  description: string | null;
  movementPattern: string;
  equipment: string;
  difficulty: string;
  isBodyweight: boolean;
  isUnilateral: boolean;
  isSystemDefault: boolean;
  romDegrees: number;
  metadata: ExerciseMetadata;
  muscles?: ExerciseMuscle[];
}

export interface TrainingPlan {
  id: string;
  name: string;
  description: string | null;
  planType: string;
  isActive: boolean;
  sortOrder: number;
}

export interface PlanExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sortOrder: number;
  targetSets: number;
  targetReps: number;
  targetWeightKg: string | null;
  targetRpe: string | null;
  restSeconds: number;
  supersetGroup: number | null;
  notes: string | null;
}

export interface TrainingPlanDetail extends TrainingPlan {
  exercises: PlanExercise[];
}

export interface CreatePlanRequest {
  name: string;
  description?: string;
  planType?: string;
}

export interface AddPlanExerciseRequest {
  exerciseId: string;
  sortOrder?: number;
  targetSets?: number;
  targetReps?: number;
  targetWeightKg?: number;
  targetRpe?: number;
  restSeconds?: number;
  supersetGroup?: number;
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  planId: string | null;
  name: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  notes: string | null;
  totalEnergyKcal: number | null;
  totalVolumeKg: number | null;
}

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe: number | null;
  tempoEccentricS: number;
  tempoPauseBottomS: number;
  tempoConcentricS: number;
  tempoPauseTopS: number;
  isWarmup: boolean;
  isDropset: boolean;
  isFailure: boolean;
  restAfterSeconds: number | null;
  energyKcal: number | null;
  energyPotentialKcal: number | null;
  energyKineticKcal: number | null;
  energyIsometricKcal: number | null;
  notes: string | null;
  performedAt: string;
}

export interface WorkoutSessionDetail extends WorkoutSession {
  sets: WorkoutSet[];
}

export interface StartSessionRequest {
  name: string;
  planId?: string;
}

export interface LogSetRequest {
  exerciseId: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number;
  tempoEccentricS?: number;
  tempoPauseBottomS?: number;
  tempoConcentricS?: number;
  tempoPauseTopS?: number;
  isWarmup?: boolean;
  isDropset?: boolean;
  isFailure?: boolean;
  restAfterSeconds?: number;
  notes?: string;
}

export interface LogSetResponse {
  id: string;
  energyKcal: number;
  energyPotentialKcal: number;
  energyKineticKcal: number;
  energyIsometricKcal: number;
}

export interface SetEnergyPreview {
  totalKcal: number;
  potentialKcal: number;
  kineticKcal: number;
  isometricKcal: number;
}

export interface CalculateEnergyRequest {
  exerciseId: string;
  weightKg: number;
  reps: number;
  tempoEccentricS?: number;
  tempoPauseBottomS?: number;
  tempoConcentricS?: number;
  tempoPauseTopS?: number;
}

export interface PlateCalculationResult {
  plates: number[];
  remainder: number;
}

export interface MuscleEnergyData {
  muscleName: string;
  displayName: string;
  energyKcal: number;
  relativeSize: number;
  svgRegionId: string;
  bodyMapPosition: string;
}

export interface EnergyStatsPoint {
  date: string;
  energyKcal: number;
}

export interface VolumeStatsPoint {
  date: string;
  volumeKg: number;
}

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
