/// <reference types="vitest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// ── Mock all training API calls ──────────────────────────────────────────────
vi.mock('@/lib/api/client', () => ({
  listPlans: vi.fn().mockResolvedValue({ plans: [] }),
  createPlan: vi.fn().mockResolvedValue({ id: 'plan-1' }),
  getPlan: vi.fn().mockResolvedValue({ id: 'plan-1', name: 'Push Day', description: null, planType: 'push', isActive: true, sortOrder: 0, exercises: [] }),
  updatePlan: vi.fn().mockResolvedValue({}),
  deletePlan: vi.fn().mockResolvedValue({}),
  addPlanExercise: vi.fn().mockResolvedValue({ id: 'pe-1' }),
  deletePlanExercise: vi.fn().mockResolvedValue({}),
  listExercises: vi.fn().mockResolvedValue({ exercises: [
    { id: 'ex-1', name: 'Bench Press', movementPattern: 'horizontal_push', equipment: 'barbell', difficulty: 'intermediate', isBodyweight: false, isUnilateral: false, isSystemDefault: true, romDegrees: 90, metadata: { instructions: ['Step 1'], tips: ['Keep back flat'], common_mistakes: [], video_url: null }, muscles: [] },
  ] }),
  getExercise: vi.fn().mockResolvedValue({ id: 'ex-1', name: 'Bench Press', description: 'Classic chest exercise.', movementPattern: 'horizontal_push', equipment: 'barbell', difficulty: 'intermediate', isBodyweight: false, isUnilateral: false, isSystemDefault: true, romDegrees: 90, metadata: { instructions: ['Lie on bench', 'Lower bar'], tips: ['Keep back flat'], common_mistakes: ['Flaring elbows'], video_url: null }, muscles: [] }),
  listMeasurements: vi.fn().mockResolvedValue({ measurements: [] }),
  createMeasurement: vi.fn().mockResolvedValue({ id: 'meas-1' }),
  deleteMeasurement: vi.fn().mockResolvedValue({}),
  latestMeasurement: vi.fn().mockResolvedValue(null),
  listMuscleGroups: vi.fn().mockResolvedValue({ muscles: [] }),
  startSession: vi.fn().mockResolvedValue({ id: 'sess-1' }),
  listSessions: vi.fn().mockResolvedValue({ sessions: [] }),
  getSession: vi.fn().mockResolvedValue({ id: 'sess-1', name: 'Workout', startedAt: new Date().toISOString(), completedAt: null, status: 'in_progress', planId: null, notes: null, totalEnergyKcal: null, totalVolumeKg: null, sets: [] }),
  updateSession: vi.fn().mockResolvedValue({}),
  logSet: vi.fn().mockResolvedValue({ id: 'set-1', energyKcal: 5.2, energyPotentialKcal: 3.1, energyKineticKcal: 0.8, energyIsometricKcal: 1.3 }),
  deleteSet: vi.fn().mockResolvedValue({}),
  statsEnergy: vi.fn().mockResolvedValue({ data: [] }),
  statsVolume: vi.fn().mockResolvedValue({ data: [] }),
  statsMuscleEnergy: vi.fn().mockResolvedValue({ data: [] }),
  calculateEnergy: vi.fn().mockResolvedValue({ totalKcal: 10, potentialKcal: 6, kineticKcal: 2, isometricKcal: 2 }),
  calculatePlates: vi.fn().mockResolvedValue({ plates: [20, 10], remainder: 0 }),
}));

// ── Mock auth ─────────────────────────────────────────────────────────────────
vi.mock('@/components/auth', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ isAuthenticated: true, isLoading: false, user: { id: 'u1', email: 'test@test.com' } }),
}));

// ── Mock next/navigation ──────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import TrainingTracker from '@/components/tools/TrainingTracker';
import BodyMeasurementsPanel from '@/components/tools/training/BodyMeasurementsPanel';
import ExerciseCatalog from '@/components/tools/training/ExerciseCatalog';
import EnergyBreakdown from '@/components/tools/training/EnergyBreakdown';
import PlateCalculator from '@/components/tools/training/PlateCalculator';

// ─────────────────────────────────────────────────────────────────────────────

describe('TrainingTracker — tabs', () => {
  it('renders the 5 tabs', async () => {
    render(<TrainingTracker />);
    await waitFor(() => {
      expect(screen.getByText('Workout')).toBeInTheDocument();
      expect(screen.getByText('Plans')).toBeInTheDocument();
      expect(screen.getByText('Exercises')).toBeInTheDocument();
      expect(screen.getByText('Body')).toBeInTheDocument();
      expect(screen.getByText('Stats')).toBeInTheDocument();
    });
  });

  it('switches to Body tab on click', async () => {
    render(<TrainingTracker />);
    await waitFor(() => screen.getByText('Body'));
    fireEvent.click(screen.getByText('Body'));
    await waitFor(() => expect(screen.getByText(/New Measurement/i)).toBeInTheDocument());
  });

  it('switches to Plans tab on click', async () => {
    render(<TrainingTracker />);
    await waitFor(() => screen.getByText('Plans'));
    fireEvent.click(screen.getByText('Plans'));
    await waitFor(() => expect(screen.getByText(/Training Plans/i)).toBeInTheDocument());
  });

  it('switches to Exercises tab on click', async () => {
    render(<TrainingTracker />);
    await waitFor(() => screen.getByText('Exercises'));
    fireEvent.click(screen.getByText('Exercises'));
    await waitFor(() => expect(screen.getByText(/Exercise Catalog/i)).toBeInTheDocument());
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('BodyMeasurementsPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the measurement form', async () => {
    render(<BodyMeasurementsPanel />);
    await waitFor(() => expect(screen.getByText(/New Measurement/i)).toBeInTheDocument());
  });

  it('shows empty state when no measurements exist', async () => {
    render(<BodyMeasurementsPanel />);
    await waitFor(() => expect(screen.getByText(/No measurements recorded yet/i)).toBeInTheDocument());
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ExerciseCatalog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders exercise cards after loading', async () => {
    render(<ExerciseCatalog />);
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeInTheDocument());
  });

  it('shows equipment and difficulty info', async () => {
    render(<ExerciseCatalog />);
    await waitFor(() => expect(screen.getByText('barbell')).toBeInTheDocument());
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('EnergyBreakdown', () => {
  it('renders total kcal', () => {
    render(<EnergyBreakdown totalKcal={10.5} potentialKcal={6} kineticKcal={2.5} isometricKcal={2} />);
    expect(screen.getByText(/10\.5/)).toBeInTheDocument();
  });

  it('renders no-data state when all null', () => {
    render(<EnergyBreakdown totalKcal={null} potentialKcal={null} kineticKcal={null} isometricKcal={null} />);
    expect(screen.getByText(/No energy data/i)).toBeInTheDocument();
  });

  it('shows component labels', () => {
    render(<EnergyBreakdown totalKcal={10} potentialKcal={6} kineticKcal={2} isometricKcal={2} />);
    expect(screen.getByText(/potential/i)).toBeInTheDocument();
    expect(screen.getByText(/kinetic/i)).toBeInTheDocument();
    expect(screen.getByText(/isometric/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PlateCalculator', () => {
  it('renders the weight input label', () => {
    render(<PlateCalculator />);
    expect(screen.getByText(/Total weight/i)).toBeInTheDocument();
  });

  it('shows bar-only message for weight < 20 kg', () => {
    render(<PlateCalculator totalWeight={15} />);
    // "Bar only" should appear when weight is below 20kg
    expect(screen.getByText(/Bar only|bar only/i)).toBeInTheDocument();
  });
});
