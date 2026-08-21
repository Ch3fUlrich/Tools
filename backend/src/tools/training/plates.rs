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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_exact_weight() {
        // 60kg total -> 40kg plates -> 20kg per side -> 1x 20kg plate
        let result = calculate_plates(60.0);
        assert_eq!(result.total_weight_kg, 60.0);
        assert_eq!(result.barbell_weight_kg, 20.0);
        assert_eq!(result.achievable_weight_kg, 60.0);
        assert_eq!(result.plates_per_side.len(), 1);
        assert_eq!(result.plates_per_side[0].weight_kg, 20.0);
        assert_eq!(result.plates_per_side[0].count, 1);
    }

    #[test]
    fn test_fractional_exact() {
        // 62.5kg total -> 42.5kg plates -> 21.25kg per side -> 1x 20kg + 1x 1.25kg
        let result = calculate_plates(62.5);
        assert_eq!(result.total_weight_kg, 62.5);
        assert_eq!(result.achievable_weight_kg, 62.5);
        assert_eq!(result.plates_per_side.len(), 2);
        assert_eq!(result.plates_per_side[0].weight_kg, 20.0);
        assert_eq!(result.plates_per_side[0].count, 1);
        assert_eq!(result.plates_per_side[1].weight_kg, 1.25);
        assert_eq!(result.plates_per_side[1].count, 1);
    }

    #[test]
    fn test_heavy_weight() {
        // 100kg total -> 80kg plates -> 40kg per side -> 2x 20kg
        let result = calculate_plates(100.0);
        assert_eq!(result.total_weight_kg, 100.0);
        assert_eq!(result.achievable_weight_kg, 100.0);
        assert_eq!(result.plates_per_side.len(), 1);
        assert_eq!(result.plates_per_side[0].weight_kg, 20.0);
        assert_eq!(result.plates_per_side[0].count, 2);
    }

    #[test]
    fn test_under_bar_weight() {
        // 10kg total -> negative plates -> 0 plates per side
        let result = calculate_plates(10.0);
        assert_eq!(result.total_weight_kg, 10.0);
        assert_eq!(result.achievable_weight_kg, 20.0);
        assert!(result.plates_per_side.is_empty());
    }

    #[test]
    fn test_non_divisible_weight() {
        // 61kg total -> 41kg plates -> 20.5kg per side
        // Best we can do with [20.0, 15.0, 10.0, 5.0, 2.5, 1.25] is 1x 20kg plate -> 60kg total
        let result = calculate_plates(61.0);
        assert_eq!(result.total_weight_kg, 61.0);
        assert_eq!(result.achievable_weight_kg, 60.0);
        assert_eq!(result.plates_per_side.len(), 1);
        assert_eq!(result.plates_per_side[0].weight_kg, 20.0);
        assert_eq!(result.plates_per_side[0].count, 1);
    }
}
