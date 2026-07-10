#![allow(dead_code)]
use super::{constants::*, types::*};

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
