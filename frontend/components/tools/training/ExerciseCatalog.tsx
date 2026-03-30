'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import CardSection from '@/components/ui/CardSection';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { listExercises, getExercise, type Exercise } from '@/lib/api/client';

const EQUIPMENT_OPTIONS = [
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'bodyweight',
  'kettlebell',
  'band',
  'other',
] as const;

const DIFFICULTY_OPTIONS = ['beginner', 'intermediate', 'advanced'] as const;

const EQUIPMENT_COLORS: Record<string, string> = {
  barbell: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  dumbbell: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  cable: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  machine: 'bg-slate-100 text-slate-800 dark:bg-slate-700/60 dark:text-slate-300',
  bodyweight: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  kettlebell: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  band: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-700/60 dark:text-gray-300',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export default function ExerciseCatalog() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Fetch exercises when filters change
  const fetchExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: Record<string, string> = {};
      if (debouncedSearch) filters.search = debouncedSearch;
      if (equipmentFilter) filters.equipment = equipmentFilter;
      if (difficultyFilter) filters.difficulty = difficultyFilter;

      const res = await listExercises(filters);
      setExercises(res.exercises);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, equipmentFilter, difficultyFilter]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  // Fetch full exercise detail when a card is selected
  const handleSelectExercise = async (id: string) => {
    if (selectedExerciseId === id) {
      setSelectedExerciseId(null);
      setSelectedExercise(null);
      return;
    }

    setSelectedExerciseId(id);
    setSelectedExercise(null);
    setDetailLoading(true);

    try {
      const detail = await getExercise(id);
      setSelectedExercise(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercise details');
      setSelectedExerciseId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <CardSection title="Exercise Catalog" gradient="from-orange-500 to-red-600">
      {/* Search & Filters */}
      <div className="space-y-4 mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search exercises..."
          className="form-input w-full"
        />

        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Equipment
            </label>
            <select
              value={equipmentFilter}
              onChange={(e) => setEquipmentFilter(e.target.value)}
              className="form-input w-full"
            >
              <option value="">All Equipment</option>
              {EQUIPMENT_OPTIONS.map((eq) => (
                <option key={eq} value={eq}>
                  {eq.charAt(0).toUpperCase() + eq.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Difficulty
            </label>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="form-input w-full"
            >
              <option value="">All Levels</option>
              {DIFFICULTY_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && <ErrorAlert error={error} />}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="spinner mr-3" />
          <span className="text-sm text-slate-500 dark:text-slate-400">Loading exercises...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && exercises.length === 0 && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">
          No exercises found. Try adjusting your filters.
        </p>
      )}

      {/* Exercise Grid */}
      {!loading && exercises.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exercises.map((exercise) => (
            <div key={exercise.id}>
              {/* Exercise Card */}
              <button
                type="button"
                onClick={() => handleSelectExercise(exercise.id)}
                className={`w-full text-left rounded-lg border p-4 transition-all duration-200 hover:shadow-md ${
                  selectedExerciseId === exercise.id
                    ? 'border-orange-400 dark:border-orange-500 bg-orange-50/50 dark:bg-orange-900/10'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm">
                  {exercise.name}
                </h3>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {/* Equipment badge */}
                  <span
                    className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                      EQUIPMENT_COLORS[exercise.equipment] || EQUIPMENT_COLORS.other
                    }`}
                  >
                    {exercise.equipment}
                  </span>

                  {/* Difficulty badge */}
                  <span
                    className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                      DIFFICULTY_COLORS[exercise.difficulty] || DIFFICULTY_COLORS.beginner
                    }`}
                  >
                    {exercise.difficulty}
                  </span>
                </div>

                {exercise.movementPattern && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {exercise.movementPattern}
                  </p>
                )}
              </button>

              {/* Inline Detail View */}
              {selectedExerciseId === exercise.id && (
                <div className="mt-2 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/10 p-4 animate-fade-in-up">
                  {detailLoading && (
                    <div className="flex items-center justify-center py-4">
                      <div className="spinner mr-2" />
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        Loading details...
                      </span>
                    </div>
                  )}

                  {selectedExercise && !detailLoading && (
                    <div className="space-y-4">
                      {/* Description */}
                      {selectedExercise.description && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Description
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {selectedExercise.description}
                          </p>
                        </div>
                      )}

                      {/* Instructions */}
                      {selectedExercise.metadata?.instructions &&
                        selectedExercise.metadata.instructions.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Instructions
                            </h4>
                            <ol className="list-decimal list-inside space-y-1">
                              {selectedExercise.metadata.instructions.map((step, i) => (
                                <li
                                  key={i}
                                  className="text-sm text-slate-600 dark:text-slate-400"
                                >
                                  {step}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                      {/* Tips */}
                      {selectedExercise.metadata?.tips &&
                        selectedExercise.metadata.tips.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Tips
                            </h4>
                            <ul className="list-disc list-inside space-y-1">
                              {selectedExercise.metadata.tips.map((tip, i) => (
                                <li
                                  key={i}
                                  className="text-sm text-slate-600 dark:text-slate-400"
                                >
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {/* Common Mistakes */}
                      {selectedExercise.metadata?.common_mistakes &&
                        selectedExercise.metadata.common_mistakes.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Common Mistakes
                            </h4>
                            <ul className="list-disc list-inside space-y-1">
                              {selectedExercise.metadata.common_mistakes.map((mistake, i) => (
                                <li
                                  key={i}
                                  className="text-sm text-red-600 dark:text-red-400"
                                >
                                  {mistake}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {/* Muscle Mappings */}
                      {selectedExercise.muscles && selectedExercise.muscles.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Muscles Worked
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedExercise.muscles.map((m, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"
                              >
                                {m.muscleName}
                                <span className="text-[10px] opacity-75">({m.involvement})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </CardSection>
  );
}
