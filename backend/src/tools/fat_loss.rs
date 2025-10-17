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
}
