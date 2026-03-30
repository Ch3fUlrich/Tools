'use client';

import React, { useState, useEffect } from 'react';
import CardSection from '@/components/ui/CardSection';
import NumberInput from '@/components/ui/NumberInput';
import ErrorAlert from '@/components/ui/ErrorAlert';
import Button from '@/components/ui/Button';
import {
  createMeasurement,
  listMeasurements,
  deleteMeasurement,
  type BodyMeasurement,
  type CreateMeasurementRequest,
} from '@/lib/api/client';

export default function BodyMeasurementsPanel() {
  // Form fields (strings for NumberInput)
  const [bodyWeightKg, setBodyWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [armLengthCm, setArmLengthCm] = useState('');
  const [upperArmLengthCm, setUpperArmLengthCm] = useState('');
  const [lowerArmLengthCm, setLowerArmLengthCm] = useState('');
  const [legLengthCm, setLegLengthCm] = useState('');
  const [upperLegLengthCm, setUpperLegLengthCm] = useState('');
  const [lowerLegLengthCm, setLowerLegLengthCm] = useState('');
  const [torsoLengthCm, setTorsoLengthCm] = useState('');
  const [shoulderWidthCm, setShoulderWidthCm] = useState('');

  // Data state
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load measurements on mount
  useEffect(() => {
    loadMeasurements();
  }, []);

  async function loadMeasurements() {
    try {
      const res = await listMeasurements(10);
      setMeasurements(res.measurements);
    } catch (err) {
      /* eslint-disable-next-line no-console */
      console.error('Failed to load measurements:', err);
    }
  }

  function resetForm() {
    setBodyWeightKg('');
    setHeightCm('');
    setArmLengthCm('');
    setUpperArmLengthCm('');
    setLowerArmLengthCm('');
    setLegLengthCm('');
    setUpperLegLengthCm('');
    setLowerLegLengthCm('');
    setTorsoLengthCm('');
    setShoulderWidthCm('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const weight = parseFloat(bodyWeightKg);
    if (isNaN(weight) || weight <= 0) {
      setError('Body weight is required and must be greater than 0.');
      return;
    }

    const req: CreateMeasurementRequest = { bodyWeightKg: weight };

    const optionalFloat = (v: string): number | undefined => {
      const n = parseFloat(v);
      return isNaN(n) ? undefined : n;
    };

    req.heightCm = optionalFloat(heightCm);
    req.armLengthCm = optionalFloat(armLengthCm);
    req.upperArmLengthCm = optionalFloat(upperArmLengthCm);
    req.lowerArmLengthCm = optionalFloat(lowerArmLengthCm);
    req.legLengthCm = optionalFloat(legLengthCm);
    req.upperLegLengthCm = optionalFloat(upperLegLengthCm);
    req.lowerLegLengthCm = optionalFloat(lowerLegLengthCm);
    req.torsoLengthCm = optionalFloat(torsoLengthCm);
    req.shoulderWidthCm = optionalFloat(shoulderWidthCm);

    setLoading(true);
    try {
      await createMeasurement(req);
      resetForm();
      await loadMeasurements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save measurement');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMeasurement(id);
      setMeasurements((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete measurement');
    }
  }

  return (
    <div className="space-y-8">
      {/* New Measurement Form */}
      <CardSection title="New Measurement" gradient="from-orange-500 to-red-600">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <ErrorAlert error={error} />}

          {/* Body Weight - required, full width */}
          <div className="space-y-2">
            <label
              htmlFor="bodyWeightKg"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Body Weight (kg) *
            </label>
            <NumberInput
              id="bodyWeightKg"
              value={bodyWeightKg}
              onChange={setBodyWeightKg}
              step={0.1}
              min={0}
              placeholder="e.g., 80.5"
              unit="kg"
            />
          </div>

          {/* Optional fields in 2-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="heightCm"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Height (cm)
              </label>
              <NumberInput
                id="heightCm"
                value={heightCm}
                onChange={setHeightCm}
                step={0.1}
                min={0}
                placeholder="e.g., 180"
                unit="cm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="shoulderWidthCm"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Shoulder Width (cm)
              </label>
              <NumberInput
                id="shoulderWidthCm"
                value={shoulderWidthCm}
                onChange={setShoulderWidthCm}
                step={0.1}
                min={0}
                placeholder="e.g., 48"
                unit="cm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="torsoLengthCm"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Torso Length (cm)
              </label>
              <NumberInput
                id="torsoLengthCm"
                value={torsoLengthCm}
                onChange={setTorsoLengthCm}
                step={0.1}
                min={0}
                placeholder="e.g., 55"
                unit="cm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="armLengthCm"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Arm Length (cm)
              </label>
              <NumberInput
                id="armLengthCm"
                value={armLengthCm}
                onChange={setArmLengthCm}
                step={0.1}
                min={0}
                placeholder="e.g., 60"
                unit="cm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="upperArmLengthCm"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Upper Arm (cm)
              </label>
              <NumberInput
                id="upperArmLengthCm"
                value={upperArmLengthCm}
                onChange={setUpperArmLengthCm}
                step={0.1}
                min={0}
                placeholder="e.g., 30"
                unit="cm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="lowerArmLengthCm"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Lower Arm (cm)
              </label>
              <NumberInput
                id="lowerArmLengthCm"
                value={lowerArmLengthCm}
                onChange={setLowerArmLengthCm}
                step={0.1}
                min={0}
                placeholder="e.g., 30"
                unit="cm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="legLengthCm"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Leg Length (cm)
              </label>
              <NumberInput
                id="legLengthCm"
                value={legLengthCm}
                onChange={setLegLengthCm}
                step={0.1}
                min={0}
                placeholder="e.g., 90"
                unit="cm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="upperLegLengthCm"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Upper Leg (cm)
              </label>
              <NumberInput
                id="upperLegLengthCm"
                value={upperLegLengthCm}
                onChange={setUpperLegLengthCm}
                step={0.1}
                min={0}
                placeholder="e.g., 50"
                unit="cm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="lowerLegLengthCm"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Lower Leg (cm)
              </label>
              <NumberInput
                id="lowerLegLengthCm"
                value={lowerLegLengthCm}
                onChange={setLowerLegLengthCm}
                step={0.1}
                min={0}
                placeholder="e.g., 40"
                unit="cm"
              />
            </div>
          </div>

          <p className="p-4 text-xs text-slate-500 dark:text-slate-400">
            Only body weight is required. Fill in additional measurements to track your proportions over time.
          </p>

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-full h-12 text-base font-semibold"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <span className="spinner mr-3" />
                Saving...
              </span>
            ) : (
              'Save Measurement'
            )}
          </Button>
        </form>
      </CardSection>

      {/* Past Measurements */}
      <CardSection title="Past Measurements" gradient="from-orange-500 to-red-600" delay="100ms">
        {measurements.length === 0 ? (
          <p className="p-4 text-xs text-slate-500 dark:text-slate-400">
            No measurements recorded yet. Add your first measurement above.
          </p>
        ) : (
          <ul className="space-y-3">
            {measurements.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {new Date(m.measuredAt).toLocaleDateString()}
                  </span>
                  <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                    {m.bodyWeightKg} kg
                  </span>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => handleDelete(m.id)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs"
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardSection>
    </div>
  );
}
