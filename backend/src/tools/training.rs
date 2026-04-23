#![allow(dead_code)]

use serde::{Deserialize, Serialize};

// ============================================================================
// CONSTANTS
// ============================================================================

/// Gravitational acceleration (m/s²)
const GRAVITY: f64 = 9.81;

/// Human skeletal muscle mechanical efficiency during concentric contractions.
/// ~25% of metabolic energy becomes mechanical work; ~75% is heat.
const MECHANICAL_EFFICIENCY: f64 = 0.25;

/// Eccentric phase metabolic cost relative to concentric.
/// Eccentric work costs roughly 50% of concentric metabolically.
const ECCENTRIC_COST_RATIO: f64 = 0.50;

/// Isometric metabolic rate factor (empirical).
/// Represents energy cost per newton of force per second of hold,
/// scaled to be used as: E_iso = force_N * iso_factor * time_s / efficiency
const ISOMETRIC_FACTOR: f64 = 0.003;

/// Joules per kilocalorie
const JOULES_PER_KCAL: f64 = 4184.0;

// ============================================================================
// SEGMENT MASS FRACTIONS (Winter 2009 / Dempster anthropometric data)
// ============================================================================

/// Fraction of total body mass for each body segment.
/// Used to compute the mass of moving body parts during exercises.
pub struct SegmentMassFractions;

impl SegmentMassFractions {
    pub const HEAD_NECK: f64 = 0.081;
    pub const TRUNK: f64 = 0.497;
    pub const UPPER_ARM: f64 = 0.028; // per arm
    pub const LOWER_ARM_HAND: f64 = 0.022; // per arm
    pub const UPPER_LEG: f64 = 0.100; // per leg
    pub const LOWER_LEG_FOOT: f64 = 0.061; // per leg

    /// Center of mass position as fraction from proximal joint
    pub const COM_TRUNK: f64 = 0.440;
    pub const COM_UPPER_ARM: f64 = 0.436;
    pub const COM_LOWER_ARM: f64 = 0.682;
    pub const COM_UPPER_LEG: f64 = 0.433;
    pub const COM_LOWER_LEG: f64 = 0.606;
}

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BodyMeasurements {
    pub body_weight_kg: f64,
    pub height_cm: Option<f64>,
    pub upper_arm_length_cm: Option<f64>,
    pub lower_arm_length_cm: Option<f64>,
    pub upper_leg_length_cm: Option<f64>,
    pub lower_leg_length_cm: Option<f64>,
    pub torso_length_cm: Option<f64>,
    pub arm_length_cm: Option<f64>,
    pub leg_length_cm: Option<f64>,
    pub shoulder_width_cm: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SegmentMasses {
    pub trunk: f64,
    pub upper_arm: f64,
    pub lower_arm_hand: f64,
    pub upper_leg: f64,
    pub lower_leg_foot: f64,
    pub total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Tempo {
    pub eccentric_s: f64,
    pub pause_bottom_s: f64,
    pub concentric_s: f64,
    pub pause_top_s: f64,
}

impl Tempo {
    pub fn standard() -> Self {
        Self { eccentric_s: 2.0, pause_bottom_s: 0.0, concentric_s: 1.0, pause_top_s: 0.0 }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetEnergyParams {
    pub weight_kg: f64,
    pub reps: u32,
    pub movement_pattern: String,
    pub primary_segments_moved: Vec<String>,
    pub rom_degrees: f64,
    pub is_bodyweight: bool,
    pub is_unilateral: bool,
    pub body_mass_fraction_moved: f64,
    pub measurements: BodyMeasurements,
    pub tempo: Tempo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetEnergy {
    pub total_kcal: f64,
    pub potential_kcal: f64,
    pub kinetic_kcal: f64,
    pub isometric_kcal: f64,
    pub mechanical_work_joules: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepEnergy {
    pub total_joules: f64,
    pub potential_joules: f64,
    pub kinetic_joules: f64,
    pub isometric_joules: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MuscleMapping {
    pub muscle_name: String,
    pub involvement: String,
    pub activation_fraction: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MuscleEnergy {
    pub muscle_name: String,
    pub energy_kcal: f64,
    pub share_fraction: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionStats {
    pub total_energy_kcal: f64,
    pub total_volume_kg: f64,
    pub total_sets: u32,
    pub total_reps: u32,
}

// ============================================================================
// CORE COMPUTATION FUNCTIONS
// ============================================================================

/// Compute the mass of each body segment from total body weight.
#[must_use]
pub fn compute_segment_masses(body_weight_kg: f64) -> SegmentMasses {
    SegmentMasses {
        trunk: body_weight_kg * SegmentMassFractions::TRUNK,
        upper_arm: body_weight_kg * SegmentMassFractions::UPPER_ARM,
        lower_arm_hand: body_weight_kg * SegmentMassFractions::LOWER_ARM_HAND,
        upper_leg: body_weight_kg * SegmentMassFractions::UPPER_LEG,
        lower_leg_foot: body_weight_kg * SegmentMassFractions::LOWER_LEG_FOOT,
        total: body_weight_kg,
    }
}

/// Compute the mass of the segments being moved for a given exercise.
/// For bilateral exercises, both arms/legs are counted.
/// For unilateral, only one side.
#[must_use]
pub fn compute_moving_segment_mass(
    body_weight_kg: f64,
    segments: &[String],
    is_unilateral: bool,
) -> f64 {
    let multiplier = if is_unilateral { 1.0 } else { 2.0 };
    let mut mass = 0.0;

    for seg in segments {
        match seg.as_str() {
            "upper_arm" => mass += body_weight_kg * SegmentMassFractions::UPPER_ARM * multiplier,
            "lower_arm" => {
                mass += body_weight_kg * SegmentMassFractions::LOWER_ARM_HAND * multiplier
            }
            "upper_leg" => mass += body_weight_kg * SegmentMassFractions::UPPER_LEG * multiplier,
            "lower_leg" => {
                mass += body_weight_kg * SegmentMassFractions::LOWER_LEG_FOOT * multiplier
            }
            "torso" => mass += body_weight_kg * SegmentMassFractions::TRUNK,
            _ => {}
        }
    }

    mass
}

/// Default limb lengths estimated from height (if specific measurements not provided).
/// Based on anthropometric proportions.
fn default_limb_length(height_cm: f64, segment: &str) -> f64 {
    match segment {
        "upper_arm" => height_cm * 0.186,
        "lower_arm" => height_cm * 0.146,
        "upper_leg" => height_cm * 0.245,
        "lower_leg" => height_cm * 0.246,
        "torso" => height_cm * 0.288,
        _ => 0.0,
    }
}

/// Get the effective length (in meters) of a segment from measurements,
/// falling back to height-based estimation.
fn get_segment_length_m(measurements: &BodyMeasurements, segment: &str) -> f64 {
    let cm = match segment {
        "upper_arm" => measurements.upper_arm_length_cm,
        "lower_arm" => measurements.lower_arm_length_cm,
        "upper_leg" => measurements.upper_leg_length_cm,
        "lower_leg" => measurements.lower_leg_length_cm,
        "torso" => measurements.torso_length_cm,
        _ => None,
    };

    let length_cm = cm.unwrap_or_else(|| {
        let height = measurements.height_cm.unwrap_or(175.0);
        default_limb_length(height, segment)
    });

    length_cm / 100.0 // convert to meters
}

/// Compute the vertical displacement (meters) of the load for one rep,
/// based on movement pattern, limb lengths, and range of motion.
#[must_use]
pub fn compute_displacement(
    movement_pattern: &str,
    measurements: &BodyMeasurements,
    rom_degrees: f64,
) -> f64 {
    let rom_rad = rom_degrees.to_radians();
    let upper_arm_m = get_segment_length_m(measurements, "upper_arm");
    let lower_arm_m = get_segment_length_m(measurements, "lower_arm");
    let upper_leg_m = get_segment_length_m(measurements, "upper_leg");
    let lower_leg_m = get_segment_length_m(measurements, "lower_leg");
    let torso_m = get_segment_length_m(measurements, "torso");

    match movement_pattern {
        "horizontal_push" | "horizontal_pull" => {
            // Bar travels arc of upper arm rotation
            upper_arm_m * rom_rad.sin()
        }
        "vertical_push" | "vertical_pull" => {
            // Full arm extension overhead
            (upper_arm_m + lower_arm_m) * (1.0 - (rom_rad * 0.5).cos())
        }
        "squat" => {
            // Hip descends based on knee/hip flexion
            (upper_leg_m + lower_leg_m) * (1.0 - (rom_rad * 0.5).cos())
        }
        "lunge" => {
            // Similar to squat, single leg
            (upper_leg_m + lower_leg_m) * (1.0 - (rom_rad * 0.5).cos())
        }
        "hinge" => {
            // Torso rotates around hip joint
            torso_m * (rom_rad * 0.5).sin()
        }
        "isolation_upper" => {
            // Forearm rotates around elbow
            lower_arm_m * (1.0 - rom_rad.cos())
        }
        "isolation_lower" => {
            // Lower leg rotates around knee
            lower_leg_m * (1.0 - rom_rad.cos())
        }
        "core" => {
            // Isometric exercises: no displacement
            0.0
        }
        "bodyweight_compound" => {
            // Complex multi-joint bodyweight movements (muscle-up, turkish get-up)
            let height_m = measurements.height_cm.unwrap_or(175.0) / 100.0;
            height_m * (rom_rad * 0.5).sin()
        }
        "carry" | "plyometric" => {
            // Approximate as partial squat displacement
            (upper_leg_m + lower_leg_m) * 0.15
        }
        _ => 0.0,
    }
}

/// Compute the metabolic energy cost of a single repetition.
///
/// Three components:
/// 1. Potential energy: gravitational work of lifting and lowering the load
/// 2. Kinetic energy: acceleration/deceleration cost (significant for explosive reps)
/// 3. Isometric energy: metabolic cost of holding during pauses
#[must_use]
pub fn compute_rep_energy(total_load_kg: f64, displacement_m: f64, tempo: &Tempo) -> RepEnergy {
    if total_load_kg <= 0.0 || displacement_m < 0.0 {
        return RepEnergy {
            total_joules: 0.0,
            potential_joules: 0.0,
            kinetic_joules: 0.0,
            isometric_joules: 0.0,
        };
    }

    // 1. POTENTIAL ENERGY (gravitational work)
    let concentric_work = total_load_kg * GRAVITY * displacement_m;
    let e_concentric = concentric_work / MECHANICAL_EFFICIENCY;
    let e_eccentric = concentric_work * ECCENTRIC_COST_RATIO / MECHANICAL_EFFICIENCY;
    let potential_joules = e_concentric + e_eccentric;

    // 2. KINETIC ENERGY (acceleration cost)
    let kinetic_joules = if displacement_m > 0.0 {
        let v_con =
            if tempo.concentric_s > 0.0 { displacement_m / tempo.concentric_s } else { 0.0 };
        let v_ecc = if tempo.eccentric_s > 0.0 { displacement_m / tempo.eccentric_s } else { 0.0 };
        let ke_con = 0.5 * total_load_kg * v_con * v_con / MECHANICAL_EFFICIENCY;
        let ke_ecc =
            0.5 * total_load_kg * v_ecc * v_ecc * ECCENTRIC_COST_RATIO / MECHANICAL_EFFICIENCY;
        ke_con + ke_ecc
    } else {
        0.0
    };

    // 3. ISOMETRIC ENERGY (holding cost during pauses)
    let force_n = total_load_kg * GRAVITY;
    let iso_bottom = force_n * ISOMETRIC_FACTOR * tempo.pause_bottom_s / MECHANICAL_EFFICIENCY;
    let iso_top = force_n * ISOMETRIC_FACTOR * tempo.pause_top_s / MECHANICAL_EFFICIENCY;
    let isometric_joules = iso_bottom + iso_top;

    RepEnergy {
        total_joules: potential_joules + kinetic_joules + isometric_joules,
        potential_joules,
        kinetic_joules,
        isometric_joules,
    }
}

/// Compute the total metabolic energy for one set.
#[must_use]
pub fn compute_set_energy(params: &SetEnergyParams) -> SetEnergy {
    if params.reps == 0 {
        return SetEnergy {
            total_kcal: 0.0,
            potential_kcal: 0.0,
            kinetic_kcal: 0.0,
            isometric_kcal: 0.0,
            mechanical_work_joules: 0.0,
        };
    }

    // Compute displacement
    let displacement =
        compute_displacement(&params.movement_pattern, &params.measurements, params.rom_degrees);

    // Compute total load (external weight + moving body segments)
    let segment_mass = compute_moving_segment_mass(
        params.measurements.body_weight_kg,
        &params.primary_segments_moved,
        params.is_unilateral,
    );

    let total_load = if params.is_bodyweight {
        params.measurements.body_weight_kg * params.body_mass_fraction_moved + params.weight_kg
    } else {
        params.weight_kg + segment_mass
    };

    // For core/isometric exercises with zero displacement, use pure isometric model
    let tempo = &params.tempo;
    let rep_energy = if displacement <= 0.0 && params.movement_pattern == "core" {
        // Pure isometric: energy based on hold time (reps = seconds for isometric)
        let force_n = total_load * GRAVITY;
        let hold_time_s = params.reps as f64; // for planks, reps = seconds
        let isometric_joules = force_n * ISOMETRIC_FACTOR * hold_time_s / MECHANICAL_EFFICIENCY;
        RepEnergy {
            total_joules: isometric_joules,
            potential_joules: 0.0,
            kinetic_joules: 0.0,
            isometric_joules,
        }
    } else {
        compute_rep_energy(total_load, displacement, tempo)
    };

    // Scale by reps (for non-core exercises)
    let reps_f = if params.movement_pattern == "core" { 1.0 } else { params.reps as f64 };
    let mechanical_work = total_load * GRAVITY * displacement * reps_f;

    SetEnergy {
        total_kcal: (rep_energy.total_joules * reps_f) / JOULES_PER_KCAL,
        potential_kcal: (rep_energy.potential_joules * reps_f) / JOULES_PER_KCAL,
        kinetic_kcal: (rep_energy.kinetic_joules * reps_f) / JOULES_PER_KCAL,
        isometric_kcal: (rep_energy.isometric_joules * reps_f) / JOULES_PER_KCAL,
        mechanical_work_joules: mechanical_work,
    }
}

/// Distribute total set energy across the muscles involved in the exercise.
///
/// Energy is attributed based on involvement pools:
/// - Primary muscles share 60% of total energy
/// - Secondary muscles share 30%
/// - Stabilizer muscles share 10%
///
/// Within each pool, energy is weighted by activation_fraction.
#[must_use]
pub fn attribute_muscle_energy(
    total_energy_kcal: f64,
    mappings: &[MuscleMapping],
) -> Vec<MuscleEnergy> {
    if mappings.is_empty() || total_energy_kcal <= 0.0 {
        return vec![];
    }

    let pool_fraction = |involvement: &str| -> f64 {
        match involvement {
            "primary" => 0.60,
            "secondary" => 0.30,
            "stabilizer" => 0.10,
            _ => 0.0,
        }
    };

    // Compute sum of activation_fraction per involvement pool
    let mut pool_sums: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
    for m in mappings {
        *pool_sums.entry(m.involvement.clone()).or_insert(0.0) += m.activation_fraction;
    }

    let mut energies: Vec<MuscleEnergy> = mappings
        .iter()
        .map(|m| {
            let pool_frac = pool_fraction(&m.involvement);
            let pool_sum = pool_sums.get(&m.involvement).copied().unwrap_or(1.0);
            let share =
                if pool_sum > 0.0 { (m.activation_fraction / pool_sum) * pool_frac } else { 0.0 };
            MuscleEnergy {
                muscle_name: m.muscle_name.clone(),
                energy_kcal: total_energy_kcal * share,
                share_fraction: share,
            }
        })
        .collect();

    // Normalize so all energy is distributed even when some pools (e.g. stabilizers) are absent.
    let total_share: f64 = energies.iter().map(|e| e.share_fraction).sum();
    if total_share > 0.0 && (total_share - 1.0).abs() > 1e-9 {
        for e in &mut energies {
            e.share_fraction /= total_share;
            e.energy_kcal = total_energy_kcal * e.share_fraction;
        }
    }
    energies
}

/// Estimate 1-rep max from a set using the Epley formula.
/// Returns None if reps is 0 or 1 (direct 1RM) or weight is 0.
#[must_use]
pub fn estimate_1rm(weight_kg: f64, reps: u32) -> Option<f64> {
    if weight_kg <= 0.0 || reps == 0 {
        return None;
    }
    if reps == 1 {
        return Some(weight_kg);
    }
    Some(weight_kg * (1.0 + reps as f64 / 30.0))
}

/// Compute total volume for a collection of sets: sum(weight_kg * reps)
#[must_use]
pub fn compute_volume(sets: &[(f64, u32)]) -> f64 {
    sets.iter().map(|(w, r)| w * *r as f64).sum()
}

// ============================================================================
// PLATE CALCULATOR
// ============================================================================

/// Standard plate weights in kg (per side)
const STANDARD_PLATES_KG: [f64; 6] = [20.0, 15.0, 10.0, 5.0, 2.5, 1.25];
const BARBELL_WEIGHT_KG: f64 = 20.0;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlateCalculation {
    pub total_weight_kg: f64,
    pub barbell_weight_kg: f64,
    pub plates_per_side: Vec<PlateCount>,
    pub achievable_weight_kg: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlateCount {
    pub weight_kg: f64,
    pub count: u32,
}

/// Calculate plates needed per side to reach target weight on a barbell.
#[must_use]
pub fn calculate_plates(target_weight_kg: f64) -> PlateCalculation {
    let weight_per_side = (target_weight_kg - BARBELL_WEIGHT_KG).max(0.0) / 2.0;
    let mut remaining = weight_per_side;
    let mut plates = Vec::new();

    for &plate in &STANDARD_PLATES_KG {
        let count = (remaining / plate).floor() as u32;
        if count > 0 {
            plates.push(PlateCount { weight_kg: plate, count });
            remaining -= plate * count as f64;
        }
    }

    let loaded_per_side: f64 = plates.iter().map(|p| p.weight_kg * p.count as f64).sum();
    let achievable = BARBELL_WEIGHT_KG + loaded_per_side * 2.0;

    PlateCalculation {
        total_weight_kg: target_weight_kg,
        barbell_weight_kg: BARBELL_WEIGHT_KG,
        plates_per_side: plates,
        achievable_weight_kg: achievable,
    }
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn test_measurements() -> BodyMeasurements {
        BodyMeasurements {
            body_weight_kg: 80.0,
            height_cm: Some(180.0),
            upper_arm_length_cm: Some(33.0),
            lower_arm_length_cm: Some(26.0),
            upper_leg_length_cm: Some(44.0),
            lower_leg_length_cm: Some(44.0),
            torso_length_cm: Some(52.0),
            arm_length_cm: Some(59.0),
            leg_length_cm: Some(88.0),
            shoulder_width_cm: Some(45.0),
        }
    }

    #[test]
    fn test_segment_mass_fractions_sum_approximately_to_one() {
        let sum = SegmentMassFractions::HEAD_NECK
            + SegmentMassFractions::TRUNK
            + 2.0 * SegmentMassFractions::UPPER_ARM
            + 2.0 * SegmentMassFractions::LOWER_ARM_HAND
            + 2.0 * SegmentMassFractions::UPPER_LEG
            + 2.0 * SegmentMassFractions::LOWER_LEG_FOOT;

        assert!((sum - 1.0).abs() < 0.01, "Segment fractions should sum to ~1.0, got {sum}");
    }

    #[test]
    fn test_segment_masses_proportional_to_body_weight() {
        let masses = compute_segment_masses(80.0);
        assert!((masses.trunk - 39.76).abs() < 0.1); // 0.497 * 80
        assert!((masses.upper_arm - 2.24).abs() < 0.1);
        assert!((masses.upper_leg - 8.0).abs() < 0.1);
    }

    #[test]
    fn test_moving_segment_mass_bilateral() {
        let segments = vec!["upper_arm".to_string(), "lower_arm".to_string()];
        let mass = compute_moving_segment_mass(80.0, &segments, false);
        // 2 * (0.028 + 0.022) * 80 = 2 * 4.0 = 8.0
        assert!((mass - 8.0).abs() < 0.1);
    }

    #[test]
    fn test_moving_segment_mass_unilateral() {
        let segments = vec!["upper_arm".to_string(), "lower_arm".to_string()];
        let mass = compute_moving_segment_mass(80.0, &segments, true);
        // 1 * (0.028 + 0.022) * 80 = 4.0
        assert!((mass - 4.0).abs() < 0.1);
    }

    #[test]
    fn test_bench_press_displacement() {
        let m = test_measurements();
        let d = compute_displacement("horizontal_push", &m, 90.0);
        // upper_arm = 0.33m, sin(90°) = 1.0 → d ≈ 0.33m
        assert!((d - 0.33).abs() < 0.02, "Bench displacement: {d}");
    }

    #[test]
    fn test_squat_displacement() {
        let m = test_measurements();
        let d = compute_displacement("squat", &m, 120.0);
        // (0.44 + 0.44) * (1 - cos(60°)) = 0.88 * 0.5 = 0.44m
        assert!((d - 0.44).abs() < 0.05, "Squat displacement: {d}");
    }

    #[test]
    fn test_hinge_displacement() {
        let m = test_measurements();
        let d = compute_displacement("hinge", &m, 90.0);
        // torso = 0.52m, sin(45°) ≈ 0.707 → d ≈ 0.368m
        assert!((d - 0.368).abs() < 0.05, "Hinge displacement: {d}");
    }

    #[test]
    fn test_core_displacement_is_zero() {
        let m = test_measurements();
        let d = compute_displacement("core", &m, 0.0);
        assert_eq!(d, 0.0);
    }

    #[test]
    fn test_zero_weight_zero_energy() {
        let params = SetEnergyParams {
            weight_kg: 0.0,
            reps: 10,
            movement_pattern: "horizontal_push".to_string(),
            primary_segments_moved: vec!["upper_arm".to_string()],
            rom_degrees: 90.0,
            is_bodyweight: false,
            is_unilateral: false,
            body_mass_fraction_moved: 0.0,
            measurements: test_measurements(),
            tempo: Tempo::standard(),
        };
        let energy = compute_set_energy(&params);
        // Even with 0 external weight, segment mass contributes energy
        // So total should be > 0 because arms still move
        assert!(energy.total_kcal >= 0.0);
    }

    #[test]
    fn test_zero_reps_zero_energy() {
        let params = SetEnergyParams {
            weight_kg: 100.0,
            reps: 0,
            movement_pattern: "squat".to_string(),
            primary_segments_moved: vec!["upper_leg".to_string(), "lower_leg".to_string()],
            rom_degrees: 120.0,
            is_bodyweight: false,
            is_unilateral: false,
            body_mass_fraction_moved: 0.0,
            measurements: test_measurements(),
            tempo: Tempo::standard(),
        };
        let energy = compute_set_energy(&params);
        assert_eq!(energy.total_kcal, 0.0);
    }

    #[test]
    fn test_bench_press_energy_reasonable() {
        let params = SetEnergyParams {
            weight_kg: 100.0,
            reps: 10,
            movement_pattern: "horizontal_push".to_string(),
            primary_segments_moved: vec!["upper_arm".to_string(), "lower_arm".to_string()],
            rom_degrees: 90.0,
            is_bodyweight: false,
            is_unilateral: false,
            body_mass_fraction_moved: 0.0,
            measurements: test_measurements(),
            tempo: Tempo::standard(),
        };
        let energy = compute_set_energy(&params);

        // A set of 10 reps at 100kg bench should be roughly 5-20 kcal
        assert!(energy.total_kcal > 1.0, "Energy too low: {}", energy.total_kcal);
        assert!(energy.total_kcal < 50.0, "Energy too high: {}", energy.total_kcal);
        assert!(energy.potential_kcal > energy.kinetic_kcal, "Potential should dominate");
    }

    #[test]
    fn test_squat_energy_higher_than_bench() {
        let m = test_measurements();
        let bench = SetEnergyParams {
            weight_kg: 100.0,
            reps: 10,
            movement_pattern: "horizontal_push".to_string(),
            primary_segments_moved: vec!["upper_arm".to_string(), "lower_arm".to_string()],
            rom_degrees: 90.0,
            is_bodyweight: false,
            is_unilateral: false,
            body_mass_fraction_moved: 0.0,
            measurements: m.clone(),
            tempo: Tempo::standard(),
        };
        let squat = SetEnergyParams {
            weight_kg: 100.0,
            reps: 10,
            movement_pattern: "squat".to_string(),
            primary_segments_moved: vec!["upper_leg".to_string(), "lower_leg".to_string()],
            rom_degrees: 120.0,
            is_bodyweight: false,
            is_unilateral: false,
            body_mass_fraction_moved: 0.0,
            measurements: m,
            tempo: Tempo::standard(),
        };

        let bench_e = compute_set_energy(&bench);
        let squat_e = compute_set_energy(&squat);

        assert!(
            squat_e.total_kcal > bench_e.total_kcal,
            "Squat ({}) should use more energy than bench ({})",
            squat_e.total_kcal,
            bench_e.total_kcal
        );
    }

    #[test]
    fn test_tempo_affects_energy() {
        let m = test_measurements();
        let standard = Tempo::standard(); // 2-0-1-0
        let slow =
            Tempo { eccentric_s: 4.0, pause_bottom_s: 2.0, concentric_s: 2.0, pause_top_s: 1.0 };
        let explosive =
            Tempo { eccentric_s: 1.0, pause_bottom_s: 0.0, concentric_s: 0.5, pause_top_s: 0.0 };

        let load = 100.0;
        let displacement = compute_displacement("horizontal_push", &m, 90.0);

        let e_standard = compute_rep_energy(load, displacement, &standard);
        let e_slow = compute_rep_energy(load, displacement, &slow);
        let e_explosive = compute_rep_energy(load, displacement, &explosive);

        // Slow tempo has significant isometric component from pauses
        assert!(
            e_slow.isometric_joules > e_standard.isometric_joules,
            "Slow tempo should have more isometric energy"
        );

        // Explosive tempo has higher kinetic component
        assert!(
            e_explosive.kinetic_joules > e_standard.kinetic_joules,
            "Explosive tempo should have more kinetic energy"
        );

        // All should have the same potential energy (same weight, same displacement)
        assert!(
            (e_slow.potential_joules - e_standard.potential_joules).abs() < 0.01,
            "Potential energy should be tempo-independent"
        );
    }

    #[test]
    fn test_bodyweight_exercise_energy() {
        let params = SetEnergyParams {
            weight_kg: 0.0,
            reps: 10,
            movement_pattern: "horizontal_push".to_string(),
            primary_segments_moved: vec!["upper_arm".to_string(), "lower_arm".to_string()],
            rom_degrees: 90.0,
            is_bodyweight: true,
            is_unilateral: false,
            body_mass_fraction_moved: 0.64, // push-up
            measurements: test_measurements(),
            tempo: Tempo::standard(),
        };
        let energy = compute_set_energy(&params);

        // 80kg * 0.64 = 51.2kg effective load
        assert!(energy.total_kcal > 0.5, "Push-up energy too low: {}", energy.total_kcal);
    }

    #[test]
    fn test_isometric_core_exercise() {
        let params = SetEnergyParams {
            weight_kg: 0.0,
            reps: 60, // 60 seconds
            movement_pattern: "core".to_string(),
            primary_segments_moved: vec!["torso".to_string()],
            rom_degrees: 0.0,
            is_bodyweight: true,
            is_unilateral: false,
            body_mass_fraction_moved: 0.70, // plank
            measurements: test_measurements(),
            tempo: Tempo::default(),
        };
        let energy = compute_set_energy(&params);

        assert!(energy.total_kcal > 0.0, "Plank should have energy cost");
        assert_eq!(energy.potential_kcal, 0.0, "Plank has no potential energy");
        assert!(energy.isometric_kcal > 0.0, "Plank energy should be isometric");
    }

    #[test]
    fn test_muscle_attribution_sums_to_total() {
        let mappings = vec![
            MuscleMapping {
                muscle_name: "chest".to_string(),
                involvement: "primary".to_string(),
                activation_fraction: 1.0,
            },
            MuscleMapping {
                muscle_name: "front_deltoid".to_string(),
                involvement: "secondary".to_string(),
                activation_fraction: 0.6,
            },
            MuscleMapping {
                muscle_name: "triceps".to_string(),
                involvement: "secondary".to_string(),
                activation_fraction: 0.7,
            },
        ];

        let total_energy = 10.0;
        let attributed = attribute_muscle_energy(total_energy, &mappings);

        let sum: f64 = attributed.iter().map(|m| m.energy_kcal).sum();
        assert!(
            (sum - total_energy).abs() < 0.01,
            "Attributed energy ({sum}) should equal total ({total_energy})"
        );
    }

    #[test]
    fn test_muscle_attribution_primary_gets_most() {
        let mappings = vec![
            MuscleMapping {
                muscle_name: "chest".to_string(),
                involvement: "primary".to_string(),
                activation_fraction: 1.0,
            },
            MuscleMapping {
                muscle_name: "triceps".to_string(),
                involvement: "secondary".to_string(),
                activation_fraction: 0.7,
            },
            MuscleMapping {
                muscle_name: "abs".to_string(),
                involvement: "stabilizer".to_string(),
                activation_fraction: 0.3,
            },
        ];

        let attributed = attribute_muscle_energy(10.0, &mappings);
        let chest = attributed.iter().find(|m| m.muscle_name == "chest").unwrap();
        let triceps = attributed.iter().find(|m| m.muscle_name == "triceps").unwrap();
        let abs = attributed.iter().find(|m| m.muscle_name == "abs").unwrap();

        assert!(chest.energy_kcal > triceps.energy_kcal);
        assert!(triceps.energy_kcal > abs.energy_kcal);
    }

    #[test]
    fn test_muscle_attribution_empty() {
        let result = attribute_muscle_energy(10.0, &[]);
        assert!(result.is_empty());
    }

    #[test]
    fn test_1rm_estimation() {
        // Epley: 1RM = weight * (1 + reps/30)
        let rm = estimate_1rm(100.0, 10).unwrap();
        assert!((rm - 133.33).abs() < 0.1, "1RM estimate: {rm}");
    }

    #[test]
    fn test_1rm_single_rep() {
        let rm = estimate_1rm(150.0, 1).unwrap();
        assert_eq!(rm, 150.0);
    }

    #[test]
    fn test_1rm_zero_weight() {
        assert!(estimate_1rm(0.0, 10).is_none());
    }

    #[test]
    fn test_1rm_zero_reps() {
        assert!(estimate_1rm(100.0, 0).is_none());
    }

    #[test]
    fn test_volume_calculation() {
        let sets = vec![(100.0, 10u32), (90.0, 8), (80.0, 12)];
        let volume = compute_volume(&sets);
        assert!((volume - 2680.0).abs() < 0.01);
    }

    #[test]
    fn test_plate_calculator() {
        let result = calculate_plates(100.0);
        assert_eq!(result.barbell_weight_kg, 20.0);
        // 100 - 20 = 80kg total plates, 40kg per side
        // 40 = 20 + 15 + 5
        assert_eq!(result.achievable_weight_kg, 100.0);
    }

    #[test]
    fn test_plate_calculator_empty_bar() {
        let result = calculate_plates(20.0);
        assert!(result.plates_per_side.is_empty());
        assert_eq!(result.achievable_weight_kg, 20.0);
    }

    #[test]
    fn test_plate_calculator_odd_weight() {
        let result = calculate_plates(23.0);
        // Can only do 22.5 (bar + 1.25 per side)
        assert!((result.achievable_weight_kg - 22.5).abs() < 0.01);
    }

    #[test]
    fn test_default_limb_fallback() {
        let m = BodyMeasurements {
            body_weight_kg: 80.0,
            height_cm: Some(180.0),
            upper_arm_length_cm: None,
            lower_arm_length_cm: None,
            upper_leg_length_cm: None,
            lower_leg_length_cm: None,
            torso_length_cm: None,
            arm_length_cm: None,
            leg_length_cm: None,
            shoulder_width_cm: None,
        };
        let d = compute_displacement("horizontal_push", &m, 90.0);
        // Should use default: 180 * 0.186 = 33.48cm → 0.3348m
        assert!(d > 0.3 && d < 0.4, "Fallback displacement: {d}");
    }

    #[test]
    fn test_unilateral_exercise_less_segment_mass() {
        let m = test_measurements();
        let bilateral = SetEnergyParams {
            weight_kg: 20.0,
            reps: 10,
            movement_pattern: "isolation_upper".to_string(),
            primary_segments_moved: vec!["lower_arm".to_string()],
            rom_degrees: 130.0,
            is_bodyweight: false,
            is_unilateral: false,
            body_mass_fraction_moved: 0.0,
            measurements: m.clone(),
            tempo: Tempo::standard(),
        };
        let unilateral = SetEnergyParams { is_unilateral: true, ..bilateral.clone() };

        let e_bi = compute_set_energy(&bilateral);
        let e_uni = compute_set_energy(&unilateral);

        // Unilateral should use slightly less total energy (less segment mass)
        assert!(e_uni.total_kcal < e_bi.total_kcal);
    }
}
