-- migration: create dice_rolls table
-- This migration contains the canonical schema that is currently applied in the
-- database. Keep the SQL deterministic and idempotent so sqlx's checksum remains stable.
CREATE TABLE IF NOT EXISTS dice_rolls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    session_id text NULL,
    payload jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dice_rolls_user ON dice_rolls(user_id);
CREATE INDEX IF NOT EXISTS idx_dice_rolls_session ON dice_rolls(session_id);
