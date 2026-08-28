-- Saved input sets for the Elterngeld / income-tax optimizer.
--
-- The tool computes entirely in the browser; nothing is stored unless the signed-in user
-- explicitly saves a scenario. Every row is owned by exactly one user and the API only ever
-- reads and writes rows matching the session's user_id, so one user cannot see another's
-- figures. ON DELETE CASCADE means deleting the account takes the saved scenarios with it.
CREATE TABLE IF NOT EXISTS elterngeld_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    -- Opaque to the backend on purpose: the tool's input set changes with every tax year,
    -- and a column per field would need a migration each time. The frontend owns the shape
    -- and stamps it with a version so it can migrate old payloads on read.
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_elterngeld_inputs_user_id ON elterngeld_inputs (user_id);

-- Saving under a name that already exists overwrites it, so the name has to be unique per
-- user. Case-insensitive: "Base case" and "base case" are the same scenario to a person.
CREATE UNIQUE INDEX IF NOT EXISTS idx_elterngeld_inputs_user_name
    ON elterngeld_inputs (user_id, lower(name));
