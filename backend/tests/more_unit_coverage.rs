use chrono::Utc;
use tools_backend::tools::bloodlevel::{SubstanceIntake, ToleranceRequest};

#[tokio::test]
async fn test_bloodlevel_single_intake_amount_positive() {
    // Use a known substance name from get_substances (Caffeine)
    let now = Utc::now();
    let intake = SubstanceIntake {
        substance: "Caffeine".to_string(),
        time: now - chrono::Duration::hours(1),
        intake_type: "oral".to_string(),
        time_after_meal: None,
        dosage_mg: 100.0,
    };

    let req = ToleranceRequest { intakes: vec![intake], time_points: vec![now] };

    let res = tools_backend::tools::bloodlevel::calculate_blood_levels(req).expect("calc failed");
    assert!(!res.blood_levels.is_empty());
    assert!(res.blood_levels.iter().any(|p| p.amount_mg > 0.0));
}

#[tokio::test]
async fn test_bloodlevel_future_intake_skipped() {
    let now = Utc::now();
    let intake = SubstanceIntake {
        substance: "Caffeine".to_string(),
        time: now + chrono::Duration::hours(1),
        intake_type: "oral".to_string(),
        time_after_meal: None,
        dosage_mg: 100.0,
    };

    let req = ToleranceRequest { intakes: vec![intake], time_points: vec![now] };

    let res = tools_backend::tools::bloodlevel::calculate_blood_levels(req).expect("calc failed");
    // Since the intake is in the future, the computed amount should be 0 for that time point
    assert!(res.blood_levels.iter().all(|p| p.amount_mg == 0.0));
}

#[tokio::test]
async fn test_bloodlevel_missing_substance_error() {
    let now = Utc::now();
    let intake = SubstanceIntake {
        substance: "NotARealDrug".to_string(),
        time: now - chrono::Duration::hours(1),
        intake_type: "oral".to_string(),
        time_after_meal: None,
        dosage_mg: 50.0,
    };

    let req = ToleranceRequest { intakes: vec![intake], time_points: vec![now] };

    let res = tools_backend::tools::bloodlevel::calculate_blood_levels(req);
    assert!(res.is_err());
}

#[test]
fn test_find_substance_by_name_case_insensitive() {
    let subs = tools_backend::tools::bloodlevel::get_substances();
    let found = tools_backend::tools::bloodlevel::find_substance_by_name("caffeine", &subs);
    assert!(found.is_some());
    assert_eq!(found.unwrap().id, "caffeine");
}
