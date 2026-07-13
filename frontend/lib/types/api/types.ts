export interface RollDicePayload {
  die?: unknown;
  dice?: unknown;
  count?: number;
  modifiers?: unknown[];
  reroll?: unknown;
}

export interface FatLossRequest {
  kcal_deficit?: number;
  weight_loss_kg?: number;
  calorieDeficit?: number;
  weightLossKg?: number;
}

export interface FatLossResponse {
  fat_loss_percentage?: number;
  muscle_loss_percentage?: number;
  is_valid?: boolean;
  fatLossKg?: number;
  muscleLossKg?: number;
  fatLossPercentage?: number;
  muscleLossPercentage?: number;
}

export interface Transaction {
  amount: number;
  category: string;
  date: string;
  description: string;
  ts?: string;
  reference_text?: string;
}

export interface AnalysisResult {
  categories?: Record<string, number>;
  totalBalance?: number;
  transactions?: Transaction[];
  category_totals?: Record<string, number>;
  overall_total?: number;
}

export interface RegisterRequest {
  username?: string;
  password?: string;
  email?: string;
}

export interface LoginRequest {
  username?: string;
  password?: string;
  email?: string;
}

export interface AuthResponse {
  user?: {
    id: string;
    username: string;
    displayName?: string;
  };
  token?: string;
  ok?: boolean;
  id?: string;
}

export interface UserProfileResponse {
  id: string;
  username: string;
  displayName: string;
  email?: string;
}

export interface OIDCCallbackRequest {
  code: string;
  state?: string;
}

export interface OIDCCallbackResponse {
  user?: {
    id: string;
    username?: string;
    displayName?: string;
    email?: string;
    created_at?: string;
  };
  token?: string;
}

export interface Substance {
  id: string;
  name: string;
  halfLifeHours: number;
}

export interface SubstanceIntakeRequest {
  substanceId?: string;
  amountMg?: number;
  timeHours?: number;
  substance?: string;
  time?: string;
  amount?: number;
}

export interface ToleranceCalculationRequest {
  intakes: SubstanceIntakeRequest[];
  time_points?: string[];
}

export interface BloodLevelPoint {
  timeHours?: number;
  levelMg?: number;
  time?: string;
  substance?: string;
  amountMg?: number;
}

export interface ToleranceCalculationResponse {
  points?: BloodLevelPoint[];
  blood_levels?: BloodLevelPoint[];
}

export interface DiceHistoryEntry {
  id: string;
  payload: unknown;
  result: unknown;
  timestamp: string;
}

export interface BodyMeasurement {
  id: string;
  weightKg?: number;
  bodyFatPercentage?: number;
  muscleMassKg?: number;
  neckCircumferenceCm?: number;
  chestCircumferenceCm?: number;
  waistCircumferenceCm?: number;
  hipCircumferenceCm?: number;
  upperLegLengthCm?: number;
  lowerLegLengthCm?: number;
  armLengthCm?: number;
  upperArmLengthCm?: number;
  lowerArmLengthCm?: number;
  torsoLengthCm?: number;
  shoulderWidthCm?: number;
  measuredAt?: string;
}

export interface CreateMeasurementRequest {
  weightKg?: number;
  bodyFatPercentage?: number;
  muscleMassKg?: number;
  neckCircumferenceCm?: number;
  chestCircumferenceCm?: number;
  waistCircumferenceCm?: number;
  hipCircumferenceCm?: number;
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
