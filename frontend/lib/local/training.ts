import muscleGroupsData from './data/muscleGroups.json';
import exercisesData from './data/exercises.json';

// ============================================================================
// STATIC DATA ACCESS
// ============================================================================

export function listMuscleGroupsLocal() {
    return muscleGroupsData;
}

export function listExercisesLocal() {
    return exercisesData;
}

export function getExerciseLocal(id: string) {
    return exercisesData.find((ex: any) => ex.id === id || ex.name === id) || null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const GRAVITY = 9.81;
export const MECHANICAL_EFFICIENCY = 0.25;
export const ECCENTRIC_COST_RATIO = 0.50;
export const ISOMETRIC_FACTOR = 0.003;
export const JOULES_PER_KCAL = 4184.0;

export const SegmentMassFractions = {
    HEAD_NECK: 0.081,
    TRUNK: 0.497,
    UPPER_ARM: 0.028,
    LOWER_ARM_HAND: 0.022,
    UPPER_LEG: 0.100,
    LOWER_LEG_FOOT: 0.061,

    COM_TRUNK: 0.440,
    COM_UPPER_ARM: 0.436,
    COM_LOWER_ARM: 0.682,
    COM_UPPER_LEG: 0.433,
    COM_LOWER_LEG: 0.606,
};

// ============================================================================
// TYPES
// ============================================================================

export interface BodyMeasurements {
    bodyWeightKg: number;
    heightCm?: number | null;
    upperArmLengthCm?: number | null;
    lowerArmLengthCm?: number | null;
    upperLegLengthCm?: number | null;
    lowerLegLengthCm?: number | null;
    torsoLengthCm?: number | null;
    armLengthCm?: number | null;
    legLengthCm?: number | null;
    shoulderWidthCm?: number | null;
}

export interface SegmentMasses {
    trunk: number;
    upperArm: number;
    lowerArmHand: number;
    upperLeg: number;
    lowerLegFoot: number;
    total: number;
}

export interface Tempo {
    eccentricS: number;
    pauseBottomS: number;
    concentricS: number;
    pauseTopS: number;
}

export function defaultTempo(): Tempo {
    return { eccentricS: 2.0, pauseBottomS: 0.0, concentricS: 1.0, pauseTopS: 0.0 };
}

export interface SetEnergyParams {
    weightKg: number;
    reps: number;
    movementPattern: string;
    primarySegmentsMoved: string[];
    romDegrees: number;
    isBodyweight: boolean;
    isUnilateral: boolean;
    bodyMassFractionMoved: number;
    measurements: BodyMeasurements;
    tempo: Tempo;
}

export interface SetEnergy {
    totalKcal: number;
    potentialKcal: number;
    kineticKcal: number;
    isometricKcal: number;
    mechanicalWorkJoules: number;
}

export interface RepEnergy {
    totalJoules: number;
    potentialJoules: number;
    kineticJoules: number;
    isometricJoules: number;
}

export interface MuscleMapping {
    muscleName: string;
    involvement: string;
    activationFraction: number;
}

export interface MuscleEnergy {
    muscleName: string;
    energyKcal: number;
    shareFraction: number;
}

export interface SessionStats {
    totalEnergyKcal: number;
    totalVolumeKg: number;
    totalSets: number;
    totalReps: number;
}

export interface PlateCount {
    weightKg: number;
    count: number;
}

export interface PlateCalculation {
    totalWeightKg: number;
    barbellWeightKg: number;
    platesPerSide: PlateCount[];
    achievableWeightKg: number;
}

// ============================================================================
// CORE COMPUTATION FUNCTIONS
// ============================================================================

export function computeSegmentMasses(bodyWeightKg: number): SegmentMasses {
    return {
        trunk: bodyWeightKg * SegmentMassFractions.TRUNK,
        upperArm: bodyWeightKg * SegmentMassFractions.UPPER_ARM,
        lowerArmHand: bodyWeightKg * SegmentMassFractions.LOWER_ARM_HAND,
        upperLeg: bodyWeightKg * SegmentMassFractions.UPPER_LEG,
        lowerLegFoot: bodyWeightKg * SegmentMassFractions.LOWER_LEG_FOOT,
        total: bodyWeightKg,
    };
}

export function computeMovingSegmentMass(
    bodyWeightKg: number,
    segments: string[],
    isUnilateral: boolean
): number {
    const multiplier = isUnilateral ? 1.0 : 2.0;
    let mass = 0.0;

    for (const seg of segments) {
        switch (seg) {
            case 'upper_arm':
                mass += bodyWeightKg * SegmentMassFractions.UPPER_ARM * multiplier;
                break;
            case 'lower_arm':
                mass += bodyWeightKg * SegmentMassFractions.LOWER_ARM_HAND * multiplier;
                break;
            case 'upper_leg':
                mass += bodyWeightKg * SegmentMassFractions.UPPER_LEG * multiplier;
                break;
            case 'lower_leg':
                mass += bodyWeightKg * SegmentMassFractions.LOWER_LEG_FOOT * multiplier;
                break;
            case 'torso':
                mass += bodyWeightKg * SegmentMassFractions.TRUNK;
                break;
        }
    }

    return mass;
}

function defaultLimbLength(heightCm: number, segment: string): number {
    switch (segment) {
        case 'upper_arm': return heightCm * 0.186;
        case 'lower_arm': return heightCm * 0.146;
        case 'upper_leg': return heightCm * 0.245;
        case 'lower_leg': return heightCm * 0.246;
        case 'torso': return heightCm * 0.288;
        default: return 0.0;
    }
}

function getSegmentLengthM(measurements: BodyMeasurements, segment: string): number {
    let cm: number | null | undefined = null;
    switch (segment) {
        case 'upper_arm': cm = measurements.upperArmLengthCm; break;
        case 'lower_arm': cm = measurements.lowerArmLengthCm; break;
        case 'upper_leg': cm = measurements.upperLegLengthCm; break;
        case 'lower_leg': cm = measurements.lowerLegLengthCm; break;
        case 'torso': cm = measurements.torsoLengthCm; break;
    }

    const lengthCm = cm ?? defaultLimbLength(measurements.heightCm ?? 175.0, segment);
    return lengthCm / 100.0; // convert to meters
}

export function computeDisplacement(
    movementPattern: string,
    measurements: BodyMeasurements,
    romDegrees: number
): number {
    const romRad = romDegrees * (Math.PI / 180.0);
    const upperArmM = getSegmentLengthM(measurements, 'upper_arm');
    const lowerArmM = getSegmentLengthM(measurements, 'lower_arm');
    const upperLegM = getSegmentLengthM(measurements, 'upper_leg');
    const lowerLegM = getSegmentLengthM(measurements, 'lower_leg');
    const torsoM = getSegmentLengthM(measurements, 'torso');

    switch (movementPattern) {
        case 'horizontal_push':
        case 'horizontal_pull':
            return upperArmM * Math.sin(romRad);
        case 'vertical_push':
        case 'vertical_pull':
            return (upperArmM + lowerArmM) * (1.0 - Math.cos(romRad * 0.5));
        case 'squat':
        case 'lunge':
            return (upperLegM + lowerLegM) * (1.0 - Math.cos(romRad * 0.5));
        case 'hinge':
            return torsoM * Math.sin(romRad * 0.5);
        case 'isolation_upper':
            return lowerArmM * (1.0 - Math.cos(romRad));
        case 'isolation_lower':
            return lowerLegM * (1.0 - Math.cos(romRad));
        case 'core':
            return 0.0;
        case 'bodyweight_compound':
            const heightM = (measurements.heightCm ?? 175.0) / 100.0;
            return heightM * Math.sin(romRad * 0.5);
        case 'carry':
        case 'plyometric':
            return (upperLegM + lowerLegM) * 0.15;
        default:
            return 0.0;
    }
}

export function computeRepEnergy(totalLoadKg: number, displacementM: number, tempo: Tempo): RepEnergy {
    if (totalLoadKg <= 0.0 || displacementM < 0.0) {
        return {
            totalJoules: 0.0,
            potentialJoules: 0.0,
            kineticJoules: 0.0,
            isometricJoules: 0.0,
        };
    }

    // 1. POTENTIAL ENERGY
    const concentricWork = totalLoadKg * GRAVITY * displacementM;
    const eConcentric = concentricWork / MECHANICAL_EFFICIENCY;
    const eEccentric = concentricWork * ECCENTRIC_COST_RATIO / MECHANICAL_EFFICIENCY;
    const potentialJoules = eConcentric + eEccentric;

    // 2. KINETIC ENERGY
    let kineticJoules = 0.0;
    if (displacementM > 0.0) {
        const vCon = tempo.concentricS > 0.0 ? displacementM / tempo.concentricS : 0.0;
        const vEcc = tempo.eccentricS > 0.0 ? displacementM / tempo.eccentricS : 0.0;
        const keCon = 0.5 * totalLoadKg * vCon * vCon / MECHANICAL_EFFICIENCY;
        const keEcc = 0.5 * totalLoadKg * vEcc * vEcc * ECCENTRIC_COST_RATIO / MECHANICAL_EFFICIENCY;
        kineticJoules = keCon + keEcc;
    }

    // 3. ISOMETRIC ENERGY
    const forceN = totalLoadKg * GRAVITY;
    const isoBottom = forceN * ISOMETRIC_FACTOR * tempo.pauseBottomS / MECHANICAL_EFFICIENCY;
    const isoTop = forceN * ISOMETRIC_FACTOR * tempo.pauseTopS / MECHANICAL_EFFICIENCY;
    const isometricJoules = isoBottom + isoTop;

    return {
        totalJoules: potentialJoules + kineticJoules + isometricJoules,
        potentialJoules,
        kineticJoules,
        isometricJoules,
    };
}

export function computeSetEnergyLocal(params: SetEnergyParams): SetEnergy {
    if (params.reps === 0) {
        return {
            totalKcal: 0.0,
            potentialKcal: 0.0,
            kineticKcal: 0.0,
            isometricKcal: 0.0,
            mechanicalWorkJoules: 0.0,
        };
    }

    const displacement = computeDisplacement(params.movementPattern, params.measurements, params.romDegrees);

    const segmentMass = computeMovingSegmentMass(
        params.measurements.bodyWeightKg,
        params.primarySegmentsMoved,
        params.isUnilateral
    );

    let totalLoad = 0.0;
    if (params.isBodyweight) {
        totalLoad = params.measurements.bodyWeightKg * params.bodyMassFractionMoved + params.weightKg;
    } else {
        totalLoad = params.weightKg + segmentMass;
    }

    const tempo = params.tempo;
    let repEnergy: RepEnergy;

    if (displacement <= 0.0 && params.movementPattern === "core") {
        const forceN = totalLoad * GRAVITY;
        const holdTimeS = params.reps;
        const isometricJoules = forceN * ISOMETRIC_FACTOR * holdTimeS / MECHANICAL_EFFICIENCY;
        repEnergy = {
            totalJoules: isometricJoules,
            potentialJoules: 0.0,
            kineticJoules: 0.0,
            isometricJoules,
        };
    } else {
        repEnergy = computeRepEnergy(totalLoad, displacement, tempo);
    }

    const repsF = params.movementPattern === "core" ? 1.0 : params.reps;
    const mechanicalWork = totalLoad * GRAVITY * displacement * repsF;

    return {
        totalKcal: (repEnergy.totalJoules * repsF) / JOULES_PER_KCAL,
        potentialKcal: (repEnergy.potentialJoules * repsF) / JOULES_PER_KCAL,
        kineticKcal: (repEnergy.kineticJoules * repsF) / JOULES_PER_KCAL,
        isometricKcal: (repEnergy.isometricJoules * repsF) / JOULES_PER_KCAL,
        mechanicalWorkJoules: mechanicalWork,
    };
}

export function attributeMuscleEnergyLocal(
    totalEnergyKcal: number,
    mappings: MuscleMapping[]
): MuscleEnergy[] {
    if (mappings.length === 0 || totalEnergyKcal <= 0.0) {
        return [];
    }

    const poolFraction = (involvement: string) => {
        switch (involvement) {
            case "primary": return 0.60;
            case "secondary": return 0.30;
            case "stabilizer": return 0.10;
            default: return 0.0;
        }
    };

    const poolSums: Record<string, number> = {};
    for (const m of mappings) {
        poolSums[m.involvement] = (poolSums[m.involvement] || 0.0) + m.activationFraction;
    }

    const energies = mappings.map(m => {
        const poolFrac = poolFraction(m.involvement);
        const poolSum = poolSums[m.involvement] || 1.0;
        const share = poolSum > 0.0 ? (m.activationFraction / poolSum) * poolFrac : 0.0;
        return {
            muscleName: m.muscleName,
            energyKcal: totalEnergyKcal * share,
            shareFraction: share,
        };
    });

    const totalShare = energies.reduce((acc, e) => acc + e.shareFraction, 0);
    if (totalShare > 0.0 && Math.abs(totalShare - 1.0) > 1e-9) {
        for (const e of energies) {
            e.shareFraction /= totalShare;
            e.energyKcal = totalEnergyKcal * e.shareFraction;
        }
    }

    return energies;
}

export function estimate1RmLocal(weightKg: number, reps: number): number | null {
    if (weightKg <= 0.0 || reps === 0) {
        return null;
    }
    if (reps === 1) {
        return weightKg;
    }
    return weightKg * (1.0 + reps / 30.0);
}

export function computeVolumeLocal(sets: { weightKg: number; reps: number }[]): number {
    return sets.reduce((acc, set) => acc + set.weightKg * set.reps, 0);
}

// ============================================================================
// PLATE CALCULATOR
// ============================================================================

const STANDARD_PLATES_KG = [20.0, 15.0, 10.0, 5.0, 2.5, 1.25];
const BARBELL_WEIGHT_KG = 20.0;

export function calculatePlatesLocal(targetWeightKg: number): PlateCalculation {
    const weightPerSide = Math.max(targetWeightKg - BARBELL_WEIGHT_KG, 0.0) / 2.0;
    let remaining = weightPerSide;
    const plates: PlateCount[] = [];

    for (const plate of STANDARD_PLATES_KG) {
        const count = Math.floor(remaining / plate);
        if (count > 0) {
            plates.push({ weightKg: plate, count });
            remaining -= plate * count;
        }
    }

    const loadedPerSide = plates.reduce((acc, p) => acc + p.weightKg * p.count, 0);
    const achievable = BARBELL_WEIGHT_KG + loadedPerSide * 2.0;

    return {
        totalWeightKg: targetWeightKg,
        barbellWeightKg: BARBELL_WEIGHT_KG,
        platesPerSide: plates,
        achievableWeightKg: achievable,
    };
}
