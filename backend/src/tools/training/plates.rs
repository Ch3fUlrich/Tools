#![allow(dead_code)]
use serde::{Deserialize, Serialize};

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
