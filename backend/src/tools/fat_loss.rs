use serde::{Deserialize, Serialize};

/// Constants for calorie calculations
const KCAL_PER_KG_FAT: f64 = 7000.0;
const KCAL_PER_KG_MUSCLE: f64 = 1200.0;

#[derive(Debug, Serialize, Deserialize)]
pub struct FatLossRequest {
    pub kcal_deficit: f64,
    pub weight_loss_kg: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FatLossResponse {
    pub fat_loss_percentage: Option<f64>,
    pub muscle_loss_percentage: Option<f64>,
    pub is_valid: bool,
}

/// Calculate the percentage of fat loss vs muscle loss based on calorie deficit and weight loss
///
/// Based on the formula:
/// - 1kg of fat = 7000 kcal
/// - 1kg of muscle = 1200 kcal
/// - fat_loss = (kcal_deficit - 1200 * weight_loss) / 5800 / weight_loss
pub fn calculate_fat_loss_percentage(kcal_deficit: f64, weight_loss_kg: f64) -> FatLossResponse {
    // Validation
    if kcal_deficit <= 0.0 || weight_loss_kg <= 0.0 {
        return FatLossResponse {
            fat_loss_percentage: None,
            muscle_loss_percentage: None,
            is_valid: false,
        };
    }

    // Calculate fat loss percentage
    let fat_percentage = ((kcal_deficit - KCAL_PER_KG_MUSCLE * weight_loss_kg)
        / (KCAL_PER_KG_FAT - KCAL_PER_KG_MUSCLE))
        / weight_loss_kg;

    // Ensure percentage is between 0 and 1
    if !(0.0..=1.0).contains(&fat_percentage) {
        return FatLossResponse {
            fat_loss_percentage: None,
            muscle_loss_percentage: None,
            is_valid: false,
        };
    }

    let muscle_percentage = 1.0 - fat_percentage;

    FatLossResponse {
        fat_loss_percentage: Some(fat_percentage * 100.0),
        muscle_loss_percentage: Some(muscle_percentage * 100.0),
        is_valid: true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_fat_loss_calculation() {
        let result = calculate_fat_loss_percentage(3500.0, 0.5);
        assert!(result.is_valid);
        assert!(result.fat_loss_percentage.is_some());
        assert!(result.muscle_loss_percentage.is_some());
    }

    #[test]
    fn test_invalid_zero_values() {
        let result = calculate_fat_loss_percentage(0.0, 0.5);
        assert!(!result.is_valid);

        let result = calculate_fat_loss_percentage(3500.0, 0.0);
        assert!(!result.is_valid);
    }

    #[test]
    fn test_invalid_negative_values() {
        let result = calculate_fat_loss_percentage(-100.0, 0.5);
        assert!(!result.is_valid);

        let result = calculate_fat_loss_percentage(3500.0, -0.5);
        assert!(!result.is_valid);
    }

    #[test]
    fn test_exact_one_kilo_loss_full_fat() {
        // 7000 kcal deficit and 1 kg weight loss should be 100% fat
        let result = calculate_fat_loss_percentage(7000.0, 1.0);
        assert!(result.is_valid);
        assert!(result.fat_loss_percentage.is_some());
        let fat = result.fat_loss_percentage.unwrap();
        assert!((fat - 100.0).abs() < 1e-6);
    }

    #[test]
    fn test_small_deficit_invalid() {
        // deficit too small for the weight loss should be invalid
        let result = calculate_fat_loss_percentage(100.0, 1.0);
        assert!(!result.is_valid);
    }

    #[test]
    fn test_fat_percentage_out_of_range() {
        // Construct inputs that produce a fat percentage outside 0..=1 range
        // For example, an extremely large deficit relative to weight loss
        let result = calculate_fat_loss_percentage(1000000.0, 1.0);
        assert!(!result.is_valid);
    }

    #[test]
    fn test_boundary_values_small_positive() {
        // Very small but valid values
        let result = calculate_fat_loss_percentage(700.0, 0.2);
        // This may be invalid or valid depending on formula; ensure function returns a well-formed response
        assert!(result.fat_loss_percentage.is_none() || result.is_valid);
    }

    #[test]
    fn test_fat_percentage_exact_zero() {
        // Construct inputs so that fat_percentage computes to 0.0
        // fat_percentage = ((kcal_deficit - KCAL_PER_KG_MUSCLE * weight_loss)
        //     / (KCAL_PER_KG_FAT - KCAL_PER_KG_MUSCLE)) / weight_loss
        // For fat_percentage == 0 -> kcal_deficit == KCAL_PER_KG_MUSCLE * weight_loss
        let weight_loss = 2.0;
        let kcal_deficit = KCAL_PER_KG_MUSCLE * weight_loss;

        let result = calculate_fat_loss_percentage(kcal_deficit, weight_loss);
        // Should be valid and fat loss percentage == 0
        assert!(result.is_valid);
        assert_eq!(result.fat_loss_percentage.unwrap_or(-1.0), 0.0);
        assert_eq!(result.muscle_loss_percentage.unwrap_or(-1.0), 100.0);
    }
}
