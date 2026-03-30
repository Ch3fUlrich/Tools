-- Create body_measurements table for training tracker
-- Stores user body dimensions over time for physics-based energy calculation
CREATE TABLE IF NOT EXISTS body_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    body_weight_kg DECIMAL(6,2) NOT NULL,
    height_cm DECIMAL(5,1),
    -- Limb lengths for energy calculation (biomechanics model)
    leg_length_cm DECIMAL(5,1),
    upper_leg_length_cm DECIMAL(5,1),
    lower_leg_length_cm DECIMAL(5,1),
    arm_length_cm DECIMAL(5,1),
    upper_arm_length_cm DECIMAL(5,1),
    lower_arm_length_cm DECIMAL(5,1),
    torso_length_cm DECIMAL(5,1),
    shoulder_width_cm DECIMAL(5,1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_body_measurements_user ON body_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_measured_at ON body_measurements(user_id, measured_at DESC);
