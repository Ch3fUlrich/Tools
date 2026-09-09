import { describe, it, expect } from 'vitest';
import { computeSegmentMasses, SegmentMassFractions } from '../lib/local/training';

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
