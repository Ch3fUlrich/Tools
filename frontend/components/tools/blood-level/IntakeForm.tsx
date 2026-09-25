import React from 'react';
import CardSection from '@/components/ui/CardSection';
import NumberInput from '@/components/ui/NumberInput';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { Substance } from '@/lib/api/client';
import { SubstanceIntake } from './types';

interface IntakeFormProps {
  intakes: SubstanceIntake[];
  substances: Substance[];
  loading: boolean;
  error: string | null;
  onAddIntake: () => void;
  onRemoveIntake: (index: number) => void;
  onUpdateIntake: (index: number, updates: Partial<SubstanceIntake>) => void;
  onCalculate: () => void;
}

const IntakeForm: React.FC<IntakeFormProps> = ({
  intakes,
  substances,
  loading,
  error,
  onAddIntake,
  onRemoveIntake,
  onUpdateIntake,
  onCalculate,
}) => {
  return (
    <CardSection
      title="Substance Intake"
      gradient="from-red-500 to-rose-600"
      delay="100ms"
    >
      <div className="space-y-4">
        <div className="bloodlevel-intake-table">
          <table
            className="w-full text-sm rounded-lg"
            style={{ border: '1px solid var(--card-border)' }}
          >
            <caption className="sr-only">
              Substance intakes: one row per dose, with the route taken and how
              long after a meal it was swallowed.
            </caption>
            <thead>
              <tr style={{ background: 'var(--input-bg)' }}>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium"
                  style={{ color: 'var(--muted)' }}
                >
                  Substance
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium"
                  style={{ color: 'var(--muted)' }}
                >
                  Time
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium"
                  style={{ color: 'var(--muted)' }}
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium"
                  style={{ color: 'var(--muted)' }}
                >
                  Time After Meal
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium"
                  style={{ color: 'var(--muted)' }}
                >
                  Dosage (mg)
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium"
                  style={{ color: 'var(--muted)' }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {intakes.map((intake, index) => (
                <tr
                  key={index}
                  style={{ borderTop: '1px solid var(--card-border)' }}
                >
                  <td className="px-3 py-2" data-label="Substance">
                    <select
                      aria-label={`Substance for intake ${index + 1}`}
                      value={intake.substance}
                      onChange={(e) =>
                        onUpdateIntake(index, { substance: e.target.value })
                      }
                      className="form-input text-sm"
                    >
                      <option value="">Select substance...</option>
                      {substances.map((sub) => (
                        <option key={sub.id} value={sub.name}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2" data-label="Time">
                    <input
                      type="datetime-local"
                      aria-label={`Time for intake ${index + 1}`}
                      value={intake.time.slice(0, 16)}
                      onChange={(e) =>
                        onUpdateIntake(index, {
                          time: new Date(e.target.value).toISOString(),
                        })
                      }
                      className="form-input text-sm"
                    />
                  </td>
                  <td className="px-3 py-2" data-label="Type">
                    <select
                      aria-label={`Route of administration for intake ${index + 1}`}
                      value={intake.intakeType}
                      onChange={(e) =>
                        onUpdateIntake(index, { intakeType: e.target.value })
                      }
                      className="form-input text-sm"
                    >
                      <option value="oral">Oral</option>
                      <option value="intravenous">Intravenous</option>
                      <option value="nasal">Nasal</option>
                      <option value="inhaled">Inhaled</option>
                      <option value="sublingual">Sublingual</option>
                    </select>
                  </td>
                  <td className="px-3 py-2" data-label="Time After Meal">
                    <NumberInput
                      id={`time-after-meal-${index}`}
                      ariaLabel={`Minutes after a meal for intake ${index + 1}, leave blank if fasted`}
                      value={
                        intake.timeAfterMeal !== null
                          ? String(intake.timeAfterMeal)
                          : ''
                      }
                      onChange={(v) =>
                        onUpdateIntake(index, {
                          timeAfterMeal: v ? Number(v) : null,
                        })
                      }
                      step={1}
                      min={0}
                      placeholder="minutes"
                      className="form-input--compact"
                    />
                  </td>
                  <td className="px-3 py-2" data-label="Dosage">
                    <NumberInput
                      id={`dosage-${index}`}
                      ariaLabel={`Dose in milligrams for intake ${index + 1}`}
                      value={String(intake.dosageMg)}
                      onChange={(v) =>
                        onUpdateIntake(index, { dosageMg: Number(v) })
                      }
                      step={0.1}
                      min={0}
                      placeholder="mg"
                      className="form-input--compact"
                    />
                  </td>
                  <td
                    className="px-3 py-2 bloodlevel-actions-cell"
                    data-label="Actions"
                  >
                    {intakes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoveIntake(index)}
                        className="remove-btn"
                        aria-label={`Remove intake ${index}`}
                      >
                        <span aria-hidden>✖</span>
                        <span className="sr-only">Remove</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={onAddIntake} className="btn-success w-full text-sm">
          + Add Intake
        </button>

        <button
          onClick={onCalculate}
          disabled={loading}
          aria-busy={loading}
          className="btn-primary w-full text-base mt-2 h-12 font-semibold shadow-soft-lg hover:shadow-soft-xl transition-all duration-300 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="spinner mr-3" />
              Calculating...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>🧮</span>
              Calculate Blood Levels
            </div>
          )}
        </button>

        {error && <ErrorAlert error={error} />}
      </div>
    </CardSection>
  );
};

export default IntakeForm;
