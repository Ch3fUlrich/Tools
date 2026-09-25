'use client';

import React, { useState, useEffect } from 'react';
import {
  calculateTolerance,
  getToleranceSubstances,
  Substance,
  BloodLevelPoint,
} from '../../lib/api/client';
import BloodLevelInputPanel, { SubstanceIntake } from './BloodLevelInputPanel';
import BloodLevelGraphPanel from './BloodLevelGraphPanel';
import BloodLevelExplanation from './BloodLevelExplanation';

/**
 * Gastric emptying is what food actually delays, and that effect has largely passed about
 * two hours after a meal — so an intake logged within that window counts as fed. The column
 * takes minutes since eating; leaving it blank means fasted.
 */
const FED_WINDOW_MINUTES = 120;

const isFed = (minutesAfterMeal: number | null) =>
  minutesAfterMeal !== null &&
  minutesAfterMeal >= 0 &&
  minutesAfterMeal <= FED_WINDOW_MINUTES;

/**
 * Opened cold, the tool used to show an empty row and an empty chart, which says nothing
 * about what it does. These two seed a realistic curve straight away: a coffee two hours
 * ago and an ibuprofen an hour ago. Caffeine's 5.7 h half-life against ibuprofen's 2 h
 * makes the point of the whole tool visible in one glance — the short-half-life drug is
 * already falling away while the stimulant is barely down.
 *
 * Only applied when the loaded substance list actually contains both, so a backend (or a
 * test) serving a different catalogue still starts blank.
 */
const EXAMPLE_INTAKES: {
  id: string;
  dosageMg: number;
  hoursAgo: number;
  route: string;
  minutesAfterMeal: number | null;
}[] = [
  // A coffee on an empty stomach, then ibuprofen taken with lunch — so the example shows
  // both the route column and the food delay doing something.
  {
    id: 'caffeine',
    dosageMg: 100,
    hoursAgo: 2,
    route: 'oral',
    minutesAfterMeal: null,
  },
  {
    id: 'ibuprofen',
    dosageMg: 400,
    hoursAgo: 1,
    route: 'oral',
    minutesAfterMeal: 15,
  },
];

const BloodLevelCalculator: React.FC = () => {
  const [intakes, setIntakes] = useState<SubstanceIntake[]>([
    {
      substance: '',
      time: new Date().toISOString(),
      intakeType: 'oral',
      timeAfterMeal: null,
      dosageMg: 0,
    },
  ]);

  const [substances, setSubstances] = useState<Substance[]>([]);
  const [bloodLevels, setBloodLevels] = useState<BloodLevelPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSubstances = async () => {
      try {
        const subs = await getToleranceSubstances();
        setSubstances(subs);

        // Seed the worked example only when every substance it needs is available.
        const subsById = new Map(subs.map((s) => [s.id, s]));
        const seeded: (SubstanceIntake | null)[] = EXAMPLE_INTAKES.map(
          (example) => {
            const match = subsById.get(example.id);
            return match
              ? {
                  substance: match.name,
                  time: new Date(
                    Date.now() - example.hoursAgo * 3_600_000
                  ).toISOString(),
                  intakeType: example.route,
                  timeAfterMeal: example.minutesAfterMeal,
                  dosageMg: example.dosageMg,
                }
              : null;
          }
        );

        if (seeded.every((s): s is SubstanceIntake => s !== null)) {
          setIntakes(seeded);
          await calculateBloodLevels(seeded);
        }
      } catch (err) {
        /* eslint-disable-next-line no-console */
        console.error('Failed to load substances:', err);
      }
    };
    loadSubstances();
    // Runs once on mount; calculateBloodLevels is stable enough for this single call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Blood level points carry the substance id; show the display name when known.
  const substanceDisplayName = (idOrName: string) =>
    substances.find((s) => s.id === idOrName)?.name ?? idOrName;

  const addIntake = () => {
    setIntakes([
      ...intakes,
      {
        substance: '',
        time: new Date().toISOString(),
        intakeType: 'oral',
        timeAfterMeal: null,
        dosageMg: 0,
      },
    ]);
  };

  const removeIntake = (index: number) => {
    if (intakes.length > 1) {
      setIntakes(intakes.filter((_, i) => i !== index));
    }
  };

  const updateIntake = (index: number, updates: Partial<SubstanceIntake>) => {
    const newIntakes = [...intakes];
    newIntakes[index] = { ...newIntakes[index], ...updates };
    setIntakes(newIntakes);
  };

  const calculateBloodLevels = async (source?: SubstanceIntake[]) => {
    setLoading(true);
    setError(null);

    const validIntakes = (source ?? intakes).filter(
      (intake) =>
        intake.substance &&
        intake.substance.trim() !== '' &&
        intake.dosageMg > 0
    );
    // Guard against a silent empty result when nothing is filled in yet —
    // only when substances are loaded, so a failed substance fetch still
    // lets the request through (and surfaces its own error).
    if (validIntakes.length === 0 && substances.length > 0) {
      setError(
        'Calculation failed — select a substance and enter a dosage greater than 0 for at least one intake.'
      );
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      const timePoints = [];
      for (let i = 0; i <= 48; i++) {
        const timePoint = new Date(now.getTime() + i * 60 * 60 * 1000);
        timePoints.push(timePoint.toISOString());
      }

      const request = {
        intakes: validIntakes.map((intake) => ({
          substance: intake.substance,
          time: intake.time,
          dosage_mg: intake.dosageMg,
          route: intake.intakeType,
          with_food: isFed(intake.timeAfterMeal),
        })),
        time_points: timePoints,
      };

      const response = await calculateTolerance(request);
      setBloodLevels(response.blood_levels);
    } catch (err) {
      /* eslint-disable-next-line no-console */
      console.error('Tolerance calc error:', err);
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bloodlevel-tool p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
      {/* Announces async results; the chart alone tells a screen reader nothing. */}
      <p role="status" aria-live="polite" className="sr-only">
        {loading
          ? 'Calculating blood levels…'
          : bloodLevels.length > 0
            ? `Blood level curves ready for ${new Set(bloodLevels.map((b) => b.substance)).size} substance(s).`
            : ''}
      </p>

      {/* Input Panel */}
      <BloodLevelInputPanel
        intakes={intakes}
        substances={substances}
        loading={loading}
        error={error}
        addIntake={addIntake}
        removeIntake={removeIntake}
        updateIntake={updateIntake}
        calculateBloodLevels={calculateBloodLevels}
      />

      {/* Results Panel */}
      <BloodLevelGraphPanel
        bloodLevels={bloodLevels}
        substanceDisplayName={substanceDisplayName}
      />

      {/* Explanation Panel */}
      <BloodLevelExplanation />
    </div>
  );
};

export default BloodLevelCalculator;
