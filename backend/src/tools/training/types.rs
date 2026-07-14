#![allow(dead_code)]
use serde::{Deserialize, Serialize};

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
