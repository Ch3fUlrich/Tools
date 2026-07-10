#![allow(dead_code)]
pub mod compute;
pub mod constants;
pub mod plates;
pub mod types;

pub use compute::*;
#[allow(unused_imports)]
pub use constants::*;
pub use plates::*;
pub use types::*;

// ============================================================================
// TESTS
// ============================================================================
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
