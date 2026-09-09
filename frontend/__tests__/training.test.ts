import { describe, it, expect } from 'vitest';
import { listExercisesLocal } from '../lib/local/training';
import exercisesData from '../lib/local/data/exercises.json';

describe('training.ts - listExercisesLocal', () => {
  it('should return the exercises data from the imported JSON', () => {
    const exercises = listExercisesLocal();

    // Check that it returns the exact same reference as the imported JSON data
    expect(exercises).toBe(exercisesData);
  });

  it('should return an array of exercise objects with expected properties', () => {
    const exercises = listExercisesLocal();

    expect(Array.isArray(exercises)).toBe(true);
    expect(exercises.length).toBeGreaterThan(0);

    // Check the structure of the first exercise to ensure data integrity
    const firstExercise = exercises[0];
    expect(firstExercise).toHaveProperty('id');
    expect(typeof firstExercise.id).toBe('string');
    expect(firstExercise).toHaveProperty('name');
    expect(typeof firstExercise.name).toBe('string');
    expect(firstExercise).toHaveProperty('movementPattern');
    expect(typeof firstExercise.movementPattern).toBe('string');
  });
});
