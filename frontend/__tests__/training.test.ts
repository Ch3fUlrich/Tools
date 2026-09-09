import { describe, it, expect } from 'vitest';
import { computeMovingSegmentMass, SegmentMassFractions } from '../lib/local/training';

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
