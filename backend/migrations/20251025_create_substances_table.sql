-- migration: create substances table for tolerance calculator
CREATE TABLE IF NOT EXISTS substances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    half_life_hours DECIMAL(10,2) NOT NULL,
    description TEXT,
    category TEXT,
    common_dosage_mg DECIMAL(10,2),
    max_daily_dose_mg DECIMAL(10,2),
    elimination_route TEXT,
    bioavailability_percent DECIMAL(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- index for faster lookups by name
CREATE UNIQUE INDEX IF NOT EXISTS idx_substances_name ON substances (lower(name));
CREATE INDEX IF NOT EXISTS idx_substances_category ON substances (category);

-- Insert some common substances with their half-lives
INSERT INTO substances (name, half_life_hours, description, category, common_dosage_mg, max_daily_dose_mg, elimination_route, bioavailability_percent) VALUES
('Caffeine', 5.7, 'Central nervous system stimulant', 'Stimulant', 100, 400, 'Hepatic metabolism', 99),
('Nicotine', 2.0, 'Addictive stimulant found in tobacco', 'Stimulant', 1, 4, 'Hepatic metabolism', 90),
('Alcohol (Ethanol)', 4.0, 'Depressant affecting CNS', 'Depressant', 14000, 56000, 'Hepatic metabolism', 100),
('Ibuprofen', 2.0, 'Non-steroidal anti-inflammatory drug', 'NSAID', 200, 1200, 'Hepatic metabolism', 80),
('Acetaminophen (Paracetamol)', 2.0, 'Pain reliever and fever reducer', 'Analgesic', 500, 4000, 'Hepatic metabolism', 79),
('Aspirin', 3.2, 'Anti-inflammatory and analgesic', 'NSAID', 325, 4000, 'Hepatic metabolism', 68),
('Codeine', 2.9, 'Opioid analgesic', 'Opioid', 30, 360, 'Hepatic metabolism', 90),
('Morphine', 2.5, 'Strong opioid analgesic', 'Opioid', 10, 200, 'Hepatic metabolism', 30),
('Diazepam (Valium)', 43.0, 'Benzodiazepine anxiolytic', 'Benzodiazepine', 5, 40, 'Hepatic metabolism', 100),
('Lorazepam (Ativan)', 12.0, 'Short-acting benzodiazepine', 'Benzodiazepine', 1, 10, 'Hepatic metabolism', 90),
('Alprazolam (Xanax)', 11.0, 'Benzodiazepine for anxiety', 'Benzodiazepine', 0.5, 4, 'Hepatic metabolism', 90),
('Fluoxetine (Prozac)', 96.0, 'Selective serotonin reuptake inhibitor', 'Antidepressant', 20, 80, 'Hepatic metabolism', 72),
('Sertraline (Zoloft)', 26.0, 'SSRI antidepressant', 'Antidepressant', 50, 200, 'Hepatic metabolism', 44),
('Citalopram (Celexa)', 35.0, 'SSRI antidepressant', 'Antidepressant', 20, 60, 'Hepatic metabolism', 80),
('Lithium', 24.0, 'Mood stabilizer', 'Mood stabilizer', 300, 2400, 'Renal excretion', 100),
('Warfarin', 40.0, 'Anticoagulant', 'Anticoagulant', 5, 15, 'Hepatic metabolism', 97),
('Digoxin', 36.0, 'Cardiac glycoside', 'Cardiovascular', 0.125, 0.5, 'Renal excretion', 70),
('Theophylline', 8.0, 'Bronchodilator', 'Respiratory', 200, 800, 'Hepatic metabolism', 96),
('Prednisone', 3.5, 'Corticosteroid', 'Corticosteroid', 5, 60, 'Hepatic metabolism', 70),
('Levothyroxine', 168.0, 'Thyroid hormone replacement', 'Thyroid', 50, 200, 'Various', 48);