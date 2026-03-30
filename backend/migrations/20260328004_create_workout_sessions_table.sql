-- Create workout_sessions and workout_sets for training tracker

CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES training_plans(id) ON DELETE SET NULL,
    measurement_id UUID REFERENCES body_measurements(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    notes TEXT,
    total_energy_kcal DECIMAL(10,2),
    total_volume_kg DECIMAL(12,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_started ON workout_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_status ON workout_sessions(user_id, status);

CREATE TABLE IF NOT EXISTS workout_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    weight_kg DECIMAL(6,2) NOT NULL DEFAULT 0.0,
    reps INTEGER NOT NULL DEFAULT 0,
    rpe DECIMAL(3,1),
    -- Tempo: eccentric-pause_bottom-concentric-pause_top (seconds)
    tempo_eccentric_s DECIMAL(3,1) DEFAULT 2.0,
    tempo_pause_bottom_s DECIMAL(3,1) DEFAULT 0.0,
    tempo_concentric_s DECIMAL(3,1) DEFAULT 1.0,
    tempo_pause_top_s DECIMAL(3,1) DEFAULT 0.0,
    -- Set flags
    is_warmup BOOLEAN NOT NULL DEFAULT FALSE,
    is_dropset BOOLEAN NOT NULL DEFAULT FALSE,
    is_failure BOOLEAN NOT NULL DEFAULT FALSE,
    rest_after_seconds INTEGER,
    -- Computed energy (3-component model)
    energy_kcal DECIMAL(8,2),
    energy_potential_kcal DECIMAL(8,2),
    energy_kinetic_kcal DECIMAL(8,2),
    energy_isometric_kcal DECIMAL(8,2),
    notes TEXT,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_sets_session ON workout_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_performed ON workout_sets(session_id, performed_at);
