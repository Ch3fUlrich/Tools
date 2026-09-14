import { describe, it, expect } from 'vitest';
import {
  listExercisesLocal,
  computeSegmentMasses,
  defaultTempo,
  computeMovingSegmentMass,
  SegmentMassFractions,
} from '../lib/local/training';
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

describe('computeSegmentMasses', () => {
  it('should correctly compute segment masses for a standard body weight', () => {
    const bodyWeightKg = 80;
    const result = computeSegmentMasses(bodyWeightKg);

    expect(result.trunk).toBeCloseTo(bodyWeightKg * SegmentMassFractions.TRUNK);
    expect(result.upperArm).toBeCloseTo(bodyWeightKg * SegmentMassFractions.UPPER_ARM);
    expect(result.lowerArmHand).toBeCloseTo(bodyWeightKg * SegmentMassFractions.LOWER_ARM_HAND);
    expect(result.upperLeg).toBeCloseTo(bodyWeightKg * SegmentMassFractions.UPPER_LEG);
    expect(result.lowerLegFoot).toBeCloseTo(bodyWeightKg * SegmentMassFractions.LOWER_LEG_FOOT);
    expect(result.total).toBe(bodyWeightKg);
  });

  it('should handle a body weight of 0 correctly', () => {
    const bodyWeightKg = 0;
    const result = computeSegmentMasses(bodyWeightKg);

    expect(result.trunk).toBe(0);
    expect(result.upperArm).toBe(0);
    expect(result.lowerArmHand).toBe(0);
    expect(result.upperLeg).toBe(0);
    expect(result.lowerLegFoot).toBe(0);
    expect(result.total).toBe(0);
  });

  it('should handle negative body weights gracefully', () => {
    const bodyWeightKg = -50;
    const result = computeSegmentMasses(bodyWeightKg);

    expect(result.trunk).toBeCloseTo(bodyWeightKg * SegmentMassFractions.TRUNK);
    expect(result.upperArm).toBeCloseTo(bodyWeightKg * SegmentMassFractions.UPPER_ARM);
    expect(result.lowerArmHand).toBeCloseTo(bodyWeightKg * SegmentMassFractions.LOWER_ARM_HAND);
    expect(result.upperLeg).toBeCloseTo(bodyWeightKg * SegmentMassFractions.UPPER_LEG);
    expect(result.lowerLegFoot).toBeCloseTo(bodyWeightKg * SegmentMassFractions.LOWER_LEG_FOOT);
    expect(result.total).toBe(bodyWeightKg);
  });
});

describe('training utilities', () => {
  describe('defaultTempo', () => {
    it('returns the standard default tempo', () => {
      const tempo = defaultTempo();
      expect(tempo).toEqual({
        eccentricS: 2.0,
        pauseBottomS: 0.0,
        concentricS: 1.0,
        pauseTopS: 0.0,
      });
    });
  });
});

describe('computeMovingSegmentMass', () => {
  const bodyWeight = 100; // Using 100kg to easily check percentages

  it('returns 0 for empty segments', () => {
    expect(computeMovingSegmentMass(bodyWeight, [], false)).toBe(0);
    expect(computeMovingSegmentMass(bodyWeight, [], true)).toBe(0);
  });

  it('calculates mass correctly for bilateral movements (multiplier 2.0)', () => {
    const mass = computeMovingSegmentMass(bodyWeight, ['upper_arm', 'lower_arm'], false);
    const expected = 100 * (SegmentMassFractions.UPPER_ARM * 2.0 + SegmentMassFractions.LOWER_ARM_HAND * 2.0);
    expect(mass).toBeCloseTo(expected);
  });

  it('calculates mass correctly for unilateral movements (multiplier 1.0)', () => {
    const mass = computeMovingSegmentMass(bodyWeight, ['upper_leg', 'lower_leg'], true);
    const expected = 100 * (SegmentMassFractions.UPPER_LEG * 1.0 + SegmentMassFractions.LOWER_LEG_FOOT * 1.0);
    expect(mass).toBeCloseTo(expected);
  });

  it('ignores multiplier for the torso segment', () => {
    const bilateralMass = computeMovingSegmentMass(bodyWeight, ['torso'], false);
    const unilateralMass = computeMovingSegmentMass(bodyWeight, ['torso'], true);

    const expected = 100 * SegmentMassFractions.TRUNK;

    expect(bilateralMass).toBeCloseTo(expected);
    expect(unilateralMass).toBeCloseTo(expected);
  });

  it('calculates mass correctly for mixed segments (torso + limbs)', () => {
    const mass = computeMovingSegmentMass(bodyWeight, ['upper_arm', 'torso'], false);
    const expected = 100 * (SegmentMassFractions.UPPER_ARM * 2.0 + SegmentMassFractions.TRUNK);
    expect(mass).toBeCloseTo(expected);
  });

  it('ignores unknown segments', () => {
    const mass = computeMovingSegmentMass(bodyWeight, ['upper_arm', 'unknown_segment', 'torso'], false);
    const expected = 100 * (SegmentMassFractions.UPPER_ARM * 2.0 + SegmentMassFractions.TRUNK);
    expect(mass).toBeCloseTo(expected);
  });
});

