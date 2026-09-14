import { describe, it, expect } from 'vitest';
import { computeDisplacement, BodyMeasurements } from '../lib/local/training';

describe('computeDisplacement', () => {
    // 175cm default height yields these default segment lengths:
    // upperArm: 175 * 0.186 / 100 = 0.3255
    // lowerArm: 175 * 0.146 / 100 = 0.2555
    // upperLeg: 175 * 0.245 / 100 = 0.42875
    // lowerLeg: 175 * 0.246 / 100 = 0.4305
    // torso: 175 * 0.288 / 100 = 0.504

    const emptyMeasurements: BodyMeasurements = {
        bodyWeightKg: 70,
    };

    const fullMeasurements: BodyMeasurements = {
        bodyWeightKg: 80,
        heightCm: 180,
        upperArmLengthCm: 35,
        lowerArmLengthCm: 28,
        upperLegLengthCm: 45,
        lowerLegLengthCm: 45,
        torsoLengthCm: 55,
    };

    it('calculates displacement for horizontal push/pull', () => {
        // upperArmM * Math.sin(romRad)
        // 0.3255 * Math.sin(90 * Math.PI / 180) = 0.3255 * 1 = 0.3255
        expect(computeDisplacement('horizontal_push', emptyMeasurements, 90)).toBeCloseTo(0.3255, 4);
        expect(computeDisplacement('horizontal_pull', emptyMeasurements, 90)).toBeCloseTo(0.3255, 4);

        // With full measurements
        // 0.35 * Math.sin(90 * PI / 180) = 0.35
        expect(computeDisplacement('horizontal_push', fullMeasurements, 90)).toBeCloseTo(0.35, 4);
    });

    it('calculates displacement for vertical push/pull', () => {
        // (upperArmM + lowerArmM) * (1.0 - Math.cos(romRad * 0.5))
        // 90 deg -> 45 deg = PI/4
        // (0.3255 + 0.2555) * (1 - cos(PI/4)) = 0.581 * (1 - 0.7071) = 0.1702
        expect(computeDisplacement('vertical_push', emptyMeasurements, 90)).toBeCloseTo(0.17015, 4);
        expect(computeDisplacement('vertical_pull', emptyMeasurements, 90)).toBeCloseTo(0.17015, 4);

        // With full measurements
        // (0.35 + 0.28) * (1 - cos(PI/4)) = 0.63 * 0.29289 = 0.1845
        expect(computeDisplacement('vertical_push', fullMeasurements, 90)).toBeCloseTo(0.18452, 4);
    });

    it('calculates displacement for squat/lunge', () => {
        // (upperLegM + lowerLegM) * (1.0 - Math.cos(romRad * 0.5))
        // 90 deg -> 45 deg
        // (0.42875 + 0.4305) * (1 - cos(PI/4)) = 0.85925 * (1 - 0.7071) = 0.25167
        expect(computeDisplacement('squat', emptyMeasurements, 90)).toBeCloseTo(0.25167, 4);
        expect(computeDisplacement('lunge', emptyMeasurements, 90)).toBeCloseTo(0.25167, 4);

        // Full measurements
        // (0.45 + 0.45) * 0.29289 = 0.9 * 0.29289 = 0.2636
        expect(computeDisplacement('squat', fullMeasurements, 90)).toBeCloseTo(0.2636, 4);
    });

    it('calculates displacement for hinge', () => {
        // torsoM * Math.sin(romRad * 0.5)
        // 90 deg -> 45 deg
        // 0.504 * sin(PI/4) = 0.504 * 0.7071 = 0.35638
        expect(computeDisplacement('hinge', emptyMeasurements, 90)).toBeCloseTo(0.35638, 4);

        // Full measurements
        // 0.55 * 0.7071 = 0.3889
        expect(computeDisplacement('hinge', fullMeasurements, 90)).toBeCloseTo(0.3889, 4);
    });

    it('calculates displacement for isolation_upper', () => {
        // lowerArmM * (1.0 - Math.cos(romRad))
        // 90 deg -> cos(90) = 0
        // 0.2555 * 1 = 0.2555
        expect(computeDisplacement('isolation_upper', emptyMeasurements, 90)).toBeCloseTo(0.2555, 4);

        // 0.28 * 1 = 0.28
        expect(computeDisplacement('isolation_upper', fullMeasurements, 90)).toBeCloseTo(0.28, 4);
    });

    it('calculates displacement for isolation_lower', () => {
        // lowerLegM * (1.0 - Math.cos(romRad))
        // 90 deg -> cos(90) = 0
        // 0.4305 * 1 = 0.4305
        expect(computeDisplacement('isolation_lower', emptyMeasurements, 90)).toBeCloseTo(0.4305, 4);

        // 0.45 * 1 = 0.45
        expect(computeDisplacement('isolation_lower', fullMeasurements, 90)).toBeCloseTo(0.45, 4);
    });

    it('calculates displacement for core (always 0)', () => {
        expect(computeDisplacement('core', emptyMeasurements, 90)).toBe(0.0);
        expect(computeDisplacement('core', fullMeasurements, 90)).toBe(0.0);
    });

    it('calculates displacement for bodyweight_compound', () => {
        // heightM * Math.sin(romRad * 0.5)
        // 90 deg -> 45 deg
        // 1.75 * sin(PI/4) = 1.75 * 0.7071 = 1.2374
        expect(computeDisplacement('bodyweight_compound', emptyMeasurements, 90)).toBeCloseTo(1.2374, 4);

        // 1.8 * 0.7071 = 1.27279
        expect(computeDisplacement('bodyweight_compound', fullMeasurements, 90)).toBeCloseTo(1.27279, 4);
    });

    it('calculates displacement for carry/plyometric', () => {
        // (upperLegM + lowerLegM) * 0.15
        // (0.42875 + 0.4305) * 0.15 = 0.85925 * 0.15 = 0.12888
        expect(computeDisplacement('carry', emptyMeasurements, 90)).toBeCloseTo(0.12888, 4);
        expect(computeDisplacement('plyometric', emptyMeasurements, 90)).toBeCloseTo(0.12888, 4);

        // (0.45 + 0.45) * 0.15 = 0.9 * 0.15 = 0.135
        expect(computeDisplacement('carry', fullMeasurements, 90)).toBeCloseTo(0.135, 4);
    });

    it('returns 0 for unknown pattern', () => {
        expect(computeDisplacement('unknown_pattern', emptyMeasurements, 90)).toBe(0.0);
    });

    it('handles custom height correctly', () => {
        // Use default ratios but with custom height
        const customHeightMeasurements: BodyMeasurements = {
            bodyWeightKg: 70,
            heightCm: 200,
        };

        // heightM * Math.sin(romRad * 0.5) = 2.0 * 0.707106 = 1.4142
        expect(computeDisplacement('bodyweight_compound', customHeightMeasurements, 90)).toBeCloseTo(1.4142, 4);

        // horizontal_push
        // upperArmM * Math.sin(romRad) = (200 * 0.186 / 100) * 1 = 0.372
        expect(computeDisplacement('horizontal_push', customHeightMeasurements, 90)).toBeCloseTo(0.372, 4);
    });
});
