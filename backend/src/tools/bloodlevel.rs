use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct SubstanceIntake {
    pub substance: String,
    pub time: DateTime<Utc>,
    pub intake_type: String, // e.g., "oral", "intravenous", "inhaled"
    pub time_after_meal: Option<i32>, // minutes after meal, affects absorption
    pub dosage_mg: f64,
}

#[derive(Debug, Serialize)]
pub struct SubstanceInfo {
    pub id: String,
    pub name: String,
    pub half_life_hours: f64,
    pub description: Option<String>,
    pub category: Option<String>,
    pub bioavailability_percent: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct ToleranceRequest {
    pub intakes: Vec<SubstanceIntake>,
    pub time_points: Vec<DateTime<Utc>>, // times to calculate blood levels
}

#[derive(Debug, Serialize)]
pub struct BloodLevelPoint {
    pub time: DateTime<Utc>,
    pub substance: String,
    pub amount_mg: f64,
}

#[derive(Debug, Serialize)]
pub struct ToleranceResponse {
    pub blood_levels: Vec<BloodLevelPoint>,
    pub substances: Vec<SubstanceInfo>,
}

#[derive(Debug, Serialize)]
pub struct Substance {
    pub id: String,
    pub name: String,
    pub half_life_hours: f64,
    pub description: Option<String>,
    pub category: Option<String>,
    pub common_dosage_mg: Option<f64>,
    pub max_daily_dose_mg: Option<f64>,
    pub elimination_route: Option<String>,
    pub bioavailability_percent: Option<f64>,
}

// Mock database of substances - in a real app, this would come from the database
pub fn get_substances() -> Vec<Substance> {
    vec![
        Substance {
            id: "caffeine".to_string(),
            name: "Caffeine".to_string(),
            half_life_hours: 5.7,
            description: Some("Central nervous system stimulant".to_string()),
            category: Some("Stimulant".to_string()),
            common_dosage_mg: Some(100.0),
            max_daily_dose_mg: Some(400.0),
            elimination_route: Some("Hepatic metabolism".to_string()),
            bioavailability_percent: Some(99.0),
        },
        Substance {
            id: "nicotine".to_string(),
            name: "Nicotine".to_string(),
            half_life_hours: 2.0,
            description: Some("Addictive stimulant found in tobacco".to_string()),
            category: Some("Stimulant".to_string()),
            common_dosage_mg: Some(1.0),
            max_daily_dose_mg: Some(4.0),
            elimination_route: Some("Hepatic metabolism".to_string()),
            bioavailability_percent: Some(90.0),
        },
        Substance {
            id: "alcohol".to_string(),
            name: "Alcohol (Ethanol)".to_string(),
            half_life_hours: 4.0,
            description: Some("Depressant affecting CNS".to_string()),
            category: Some("Depressant".to_string()),
            common_dosage_mg: Some(14000.0),  // ~1 standard drink
            max_daily_dose_mg: Some(56000.0), // ~4 standard drinks
            elimination_route: Some("Hepatic metabolism".to_string()),
            bioavailability_percent: Some(100.0),
        },
        Substance {
            id: "ibuprofen".to_string(),
            name: "Ibuprofen".to_string(),
            half_life_hours: 2.0,
            description: Some("Non-steroidal anti-inflammatory drug".to_string()),
            category: Some("NSAID".to_string()),
            common_dosage_mg: Some(200.0),
            max_daily_dose_mg: Some(1200.0),
            elimination_route: Some("Hepatic metabolism".to_string()),
            bioavailability_percent: Some(80.0),
        },
        Substance {
            id: "paracetamol".to_string(),
            name: "Acetaminophen (Paracetamol)".to_string(),
            half_life_hours: 2.0,
            description: Some("Pain reliever and fever reducer".to_string()),
            category: Some("Analgesic".to_string()),
            common_dosage_mg: Some(500.0),
            max_daily_dose_mg: Some(4000.0),
            elimination_route: Some("Hepatic metabolism".to_string()),
            bioavailability_percent: Some(79.0),
        },
    ]
}

pub fn find_substance_by_name<'a>(
    name: &str,
    substances: &'a [Substance],
) -> Option<&'a Substance> {
    substances
        .iter()
        .find(|s| s.name.to_lowercase() == name.to_lowercase())
}

pub fn calculate_blood_levels(request: ToleranceRequest) -> Result<ToleranceResponse, String> {
    let mut blood_levels = Vec::new();
    let mut substances_info = Vec::new();
    let substances = get_substances();

    // Group intakes by substance
    let mut substance_intakes: std::collections::HashMap<String, Vec<&SubstanceIntake>> =
        std::collections::HashMap::new();

    for intake in &request.intakes {
        substance_intakes
            .entry(intake.substance.clone())
            .or_default()
            .push(intake);
    }

    for (substance_name, intakes) in substance_intakes {
        let substance = find_substance_by_name(&substance_name, &substances)
            .ok_or_else(|| format!("Substance '{}' not found in database", substance_name))?;

        substances_info.push(SubstanceInfo {
            id: substance.id.clone(),
            name: substance.name.clone(),
            half_life_hours: substance.half_life_hours,
            description: substance.description.clone(),
            category: substance.category.clone(),
            bioavailability_percent: substance.bioavailability_percent,
        });

        // Calculate blood levels at each time point
        for &time_point in &request.time_points {
            let mut total_amount = 0.0;

            for &intake in &intakes {
                // Calculate time elapsed since intake
                let time_elapsed = time_point.signed_duration_since(intake.time);
                if time_elapsed.num_seconds() < 0 {
                    continue; // Future intake, skip
                }

                let hours_elapsed = time_elapsed.num_seconds() as f64 / 3600.0;

                // Apply bioavailability
                let bioavailable_dose =
                    intake.dosage_mg * (substance.bioavailability_percent.unwrap_or(100.0) / 100.0);

                // Calculate remaining amount using half-life decay
                let remaining_amount = if substance.half_life_hours > 0.0 {
                    bioavailable_dose * (0.5_f64).powf(hours_elapsed / substance.half_life_hours)
                } else {
                    0.0 // Invalid half-life, treat as immediate elimination
                };

                // Ensure we don't add NaN or infinite values
                let safe_remaining = if remaining_amount.is_finite() && !remaining_amount.is_nan() {
                    remaining_amount
                } else {
                    0.0
                };

                total_amount += safe_remaining;
            }

            // Ensure total_amount is valid
            let safe_total_amount =
                if total_amount.is_finite() && !total_amount.is_nan() { total_amount } else { 0.0 };

            blood_levels.push(BloodLevelPoint {
                time: time_point,
                substance: substance_name.clone(),
                amount_mg: safe_total_amount,
            });
        }
    }

    Ok(ToleranceResponse { blood_levels, substances: substances_info })
}
