-- Add deleted_at column to workout_sets to support soft deletes
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_workout_sets_deleted_at ON workout_sets(deleted_at);
