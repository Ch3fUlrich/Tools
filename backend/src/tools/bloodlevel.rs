use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

pub use crate::tools::substances::bloodlevel_substances::get_substances;
// Pharmacokinetic model for the Blood Level Calculator.
//
// Mirrors frontend/lib/local/{pharmacokinetics,substanceDatabase,bloodLevel}.ts - keep both
// in sync; a frontend test pins the ordered substance ids.
//
// Doses are no longer treated as instantaneous boluses. A dose is absorbed at a rate implied
// by its published Tmax for the route it was taken by, and food delays that absorption.
// Ethanol is elimination-saturating and gets its own integrator.

#[derive(Debug, Deserialize)]
pub struct SubstanceIntake {
    pub substance: String,
    pub time: DateTime<Utc>,
    pub dosage_mg: f64,
    /// oral | intravenous | nasal | inhaled | sublingual. Missing means oral.
    #[serde(default)]
    pub route: Option<String>,
    /// Taken with or just after food, which delays absorption.
    #[serde(default)]
    pub with_food: Option<bool>,
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

fn calculate_saturating_levels(
    substance: &Substance,
    doses: &[(DateTime<Utc>, f64, f64)],
    time_points: &[DateTime<Utc>],
) -> Vec<BloodLevelPoint> {
    let origin = doses
        .iter()
        .map(|(t, _, _)| *t)
        .chain(time_points.iter().copied())
        .min()
        .unwrap_or_else(Utc::now);
    let to_hours = |t: DateTime<Utc>| -> f64 {
        t.signed_duration_since(origin).num_milliseconds() as f64 / 3_600_000.0
    };

    let saturating: Vec<SaturatingDose> = doses
        .iter()
        .map(|(t, dose, ka)| SaturatingDose {
            hours_from_start: to_hours(*t),
            bioavailable_dose: *dose,
            ka: *ka,
        })
        .collect();
    let sample_hours: Vec<f64> = time_points.iter().map(|t| to_hours(*t)).collect();

    let amounts = simulate_saturating(
        &saturating,
        substance.vmax_mg_per_hour,
        substance.km_mg,
        &sample_hours,
        0.01,
    );

    time_points
        .iter()
        .enumerate()
        .map(|(i, &time_point)| {
            let amount = amounts.get(i).copied().unwrap_or(0.0);
            BloodLevelPoint {
                time: time_point,
                substance: substance.id.clone(),
                amount_mg: if amount.is_finite() { amount } else { 0.0 },
            }
        })
        .collect()
}

fn calculate_first_order_levels(
    substance: &Substance,
    doses: &[(DateTime<Utc>, f64, f64)],
    time_points: &[DateTime<Utc>],
    ke: f64,
) -> Vec<BloodLevelPoint> {
    time_points
        .iter()
        .map(|&time_point| {
            let mut total_amount = 0.0;

            for (intake_time, bioavailable_dose, ka) in doses {
                let time_elapsed = time_point.signed_duration_since(*intake_time);
                if time_elapsed.num_seconds() < 0 {
                    break; // Doses are sorted by intake time, so all remaining doses are in the future
                }
                let hours_elapsed = time_elapsed.num_seconds() as f64 / 3600.0;
                let remaining = if ke > 0.0 {
                    amount_first_order(*bioavailable_dose, *ka, ke, hours_elapsed)
                } else {
                    0.0
                };
                if remaining.is_finite() {
                    total_amount += remaining;
                }
            }

            let safe_total_amount = if total_amount.is_finite() { total_amount } else { 0.0 };
            BloodLevelPoint {
                time: time_point,
                substance: substance.id.clone(),
                amount_mg: safe_total_amount,
            }
        })
        .collect()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Elimination {
    FirstOrder,
    /// Michaelis-Menten. Ethanol saturates alcohol dehydrogenase well below the
    /// concentration of a single drink, so it has no meaningful half-life.
    Saturating,
}

#[derive(Debug, Clone, Copy)]
pub struct RouteParams {
    pub bioavailability_percent: f64,
    /// Fasted time to peak, in hours. Zero means the dose is placed straight into the
    /// blood (intravenous), so there is no absorption phase.
    pub tmax_hours: f64,
}

#[derive(Debug, Clone, Copy, Default)]
pub struct Routes {
    pub oral: Option<RouteParams>,
    pub intravenous: Option<RouteParams>,
    pub nasal: Option<RouteParams>,
    pub inhaled: Option<RouteParams>,
    pub sublingual: Option<RouteParams>,
}

impl Routes {
    fn get(&self, route: &str) -> Option<RouteParams> {
        match route {
            "intravenous" => self.intravenous,
            "nasal" => self.nasal,
            "inhaled" => self.inhaled,
            "sublingual" => self.sublingual,
            _ => self.oral,
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct FoodEffect {
    pub tmax_factor: f64,
    pub bioavailability_factor: f64,
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
    // Model detail: kept out of the API response so the wire shape is unchanged.
    #[serde(skip)]
    pub elimination: Elimination,
    #[serde(skip)]
    pub vmax_mg_per_hour: f64,
    #[serde(skip)]
    pub km_mg: f64,
    #[serde(skip)]
    pub routes: Routes,
    #[serde(skip)]
    pub food: FoodEffect,
}

/// Absorption rate constant implied by a published Tmax.
///
/// Tmax = ln(ka / ke) / (ka - ke) cannot be inverted in closed form. Tmax falls
/// monotonically as ka rises, so bisection is safe.
pub fn absorption_rate_from_tmax(tmax_hours: f64, ke: f64) -> f64 {
    // Explicit NaN handling: `!(x > 0.0)` would say the same thing but trips
    // clippy::neg_cmp_op_on_partial_ord, and CI builds with -D warnings.
    if tmax_hours.is_nan() || tmax_hours <= 0.0 || ke.is_nan() || ke <= 0.0 {
        return f64::INFINITY;
    }
    let tmax_for = |ka: f64| -> f64 {
        if (ka - ke).abs() < 1e-9 {
            1.0 / ke
        } else {
            (ka / ke).ln() / (ka - ke)
        }
    };

    let mut low = ke * 1.000_001;
    let mut high = (ke * 10.0).max(1.0);
    let mut guard = 0;
    while tmax_for(high) > tmax_hours && guard < 200 {
        high *= 2.0;
        guard += 1;
    }
    for _ in 0..200 {
        let mid = (low + high) / 2.0;
        if tmax_for(mid) > tmax_hours {
            low = mid;
        } else {
            high = mid;
        }
    }
    (low + high) / 2.0
}

/// Amount in the body from one dose: one compartment, first-order in and out.
///
///   A(t) = F*D * ka/(ka - ke) * (e^(-ke*t) - e^(-ka*t))
///
/// An infinite ka (intravenous) collapses this to plain decay.
pub fn amount_first_order(bioavailable_dose: f64, ka: f64, ke: f64, hours: f64) -> f64 {
    if hours < 0.0 {
        return 0.0;
    }
    if !ka.is_finite() {
        return bioavailable_dose * (-ke * hours).exp();
    }
    if (ka - ke).abs() < 1e-9 {
        return bioavailable_dose * ka * hours * (-ka * hours).exp();
    }
    let value = (bioavailable_dose * ka / (ka - ke)) * ((-ke * hours).exp() - (-ka * hours).exp());
    if value > 0.0 {
        value
    } else {
        0.0
    }
}

pub struct SaturatingDose {
    pub hours_from_start: f64,
    pub bioavailable_dose: f64,
    pub ka: f64,
}

/// Ethanol. Michaelis-Menten elimination: effectively constant-rate while the amount is
/// well above Km, degrading to first-order at the tail so the curve never goes negative.
///
///   dG/dt = -ka*G                    (gut)
///   dA/dt =  ka*G - Vmax*A/(Km + A)  (body)
///
/// Non-linear elimination does not superimpose, so the whole timeline is integrated once
/// with every dose in it rather than summed dose by dose.
pub fn simulate_saturating(
    doses: &[SaturatingDose],
    vmax_mg_per_hour: f64,
    km_mg: f64,
    sample_hours: &[f64],
    step_hours: f64,
) -> Vec<f64> {
    let horizon = sample_hours
        .iter()
        .chain(doses.iter().map(|d| &d.hours_from_start))
        .fold(0.0_f64, |acc, &h| acc.max(h));
    let steps = ((horizon / step_hours).ceil() as i64).max(1);

    let mut gut = vec![0.0_f64; doses.len()];
    let mut released = vec![false; doses.len()];
    let mut body = 0.0_f64;

    let rate = |amount: f64| -> f64 {
        if amount > 0.0 {
            vmax_mg_per_hour * amount / (km_mg + amount)
        } else {
            0.0
        }
    };

    let mut order: Vec<usize> = (0..sample_hours.len()).collect();
    order.sort_by(|&a, &b| {
        sample_hours[a].partial_cmp(&sample_hours[b]).unwrap_or(std::cmp::Ordering::Equal)
    });
    let mut out = vec![0.0_f64; sample_hours.len()];
    let mut next = 0usize;

    for step in 0..=steps {
        let t = step as f64 * step_hours;

        for (i, dose) in doses.iter().enumerate() {
            if !released[i] && dose.hours_from_start <= t + 1e-12 {
                gut[i] += dose.bioavailable_dose;
                released[i] = true;
            }
        }

        while next < order.len() && sample_hours[order[next]] <= t + 1e-12 {
            out[order[next]] = if body > 0.0 { body } else { 0.0 };
            next += 1;
        }

        if step == steps {
            break;
        }

        let mut absorbed = 0.0;
        for (i, dose) in doses.iter().enumerate() {
            if gut[i] <= 0.0 {
                continue;
            }
            let remaining =
                if dose.ka.is_finite() { gut[i] * (-dose.ka * step_hours).exp() } else { 0.0 };
            absorbed += gut[i] - remaining;
            gut[i] = remaining;
        }

        let half_body = body + absorbed / 2.0 - rate(body) * step_hours / 2.0;
        body = body + absorbed - rate(half_body.max(0.0)) * step_hours;
        if body < 0.0 {
            body = 0.0;
        }
    }

    while next < order.len() {
        out[order[next]] = if body > 0.0 { body } else { 0.0 };
        next += 1;
    }

    out
}

fn elimination_rate(half_life_hours: f64) -> f64 {
    if half_life_hours > 0.0 {
        std::f64::consts::LN_2 / half_life_hours
    } else {
        0.0
    }
}

/// Route parameters after the fed/fasted adjustment. An unsupported route falls back to oral.
fn resolve_route(substance: &Substance, route: &str, with_food: bool) -> RouteParams {
    let params = substance
        .routes
        .get(route)
        .or(substance.routes.oral)
        .unwrap_or(RouteParams { bioavailability_percent: 100.0, tmax_hours: 0.0 });

    // Food only matters where there is an absorption phase to delay.
    if with_food && params.tmax_hours > 0.0 {
        RouteParams {
            bioavailability_percent: params.bioavailability_percent
                * substance.food.bioavailability_factor,
            tmax_hours: params.tmax_hours * substance.food.tmax_factor,
        }
    } else {
        params
    }
}

pub fn calculate_blood_levels(request: ToleranceRequest) -> Result<ToleranceResponse, String> {
    let mut blood_levels = Vec::new();
    let mut substances_info = Vec::new();
    let mut owned_substances: Vec<Option<Substance>> =
        get_substances().into_iter().map(Some).collect();

    // Build O(1) lookup map
    let mut substances_map: std::collections::HashMap<String, usize> =
        std::collections::HashMap::with_capacity(owned_substances.len() * 2);
    for (idx, sub) in owned_substances.iter().enumerate() {
        if let Some(s) = sub {
            substances_map.insert(s.id.to_ascii_lowercase(), idx);
            substances_map.insert(s.name.to_ascii_lowercase(), idx);
        }
    }

    // Group intakes by substance
    let mut substance_intakes: std::collections::HashMap<usize, Vec<&SubstanceIntake>> =
        std::collections::HashMap::new();

    for intake in &request.intakes {
        let substance_name = &intake.substance;
        let &idx = substances_map
            .get(&substance_name.to_ascii_lowercase())
            .ok_or_else(|| format!("Substance '{}' not found in database", substance_name))?;
        substance_intakes.entry(idx).or_default().push(intake);
    }

    for (idx, intakes) in substance_intakes {
        let substance = owned_substances[idx]
            .take()
            .expect("Substance already consumed (duplicate indexes in map)");

        let half_life_hours = substance.half_life_hours;
        let bioavailability_percent = substance.bioavailability_percent;
        let ke = elimination_rate(half_life_hours);

        // Resolve every dose once: bioavailable amount plus the absorption rate its route
        // and fed state imply.
        let mut doses: Vec<(DateTime<Utc>, f64, f64)> = intakes
            .iter()
            .map(|intake| {
                let params = resolve_route(
                    &substance,
                    intake.route.as_deref().unwrap_or("oral"),
                    intake.with_food.unwrap_or(false),
                );
                let bioavailable_dose = intake.dosage_mg * (params.bioavailability_percent / 100.0);
                let ka =
                    absorption_rate_from_tmax(params.tmax_hours, if ke > 0.0 { ke } else { 1.0 });
                (intake.time, bioavailable_dose, ka)
            })
            .collect();

        doses.sort_unstable_by_key(|(t, _, _)| *t);

        if substance.elimination == Elimination::Saturating {
            blood_levels.extend(calculate_saturating_levels(
                &substance,
                &doses,
                &request.time_points,
            ));
        } else {
            blood_levels.extend(calculate_first_order_levels(
                &substance,
                &doses,
                &request.time_points,
                ke,
            ));
        }

        substances_info.push(SubstanceInfo {
            id: substance.id,
            name: substance.name,
            half_life_hours,
            description: substance.description,
            category: substance.category,
            bioavailability_percent,
        });
    }

    Ok(ToleranceResponse { blood_levels, substances: substances_info })
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;

    fn intake(substance: &str, time: DateTime<Utc>, mg: f64) -> SubstanceIntake {
        SubstanceIntake {
            substance: substance.to_string(),
            time,
            dosage_mg: mg,
            route: None,
            with_food: None,
        }
    }

    #[test]
    fn test_calculate_blood_levels_unknown_substance() {
        let now = Utc::now();
        let request = ToleranceRequest {
            intakes: vec![intake("unknown_magic_potion", now, 100.0)],
            time_points: vec![now],
        };

        let result = calculate_blood_levels(request);

        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Substance 'unknown_magic_potion' not found in database");
    }

    #[test]
    fn absorption_phase_starts_from_zero_and_peaks_later() {
        let now = Utc::now();
        let request = ToleranceRequest {
            intakes: vec![intake("caffeine", now, 100.0)],
            time_points: vec![now, now + Duration::minutes(45), now + Duration::hours(6)],
        };

        let levels = calculate_blood_levels(request).unwrap().blood_levels;

        // Nothing is in the blood the instant an oral dose is swallowed.
        assert!(levels[0].amount_mg < 1.0, "expected ~0 at t=0, got {}", levels[0].amount_mg);
        // It peaks around the published Tmax, then falls.
        assert!(levels[1].amount_mg > levels[0].amount_mg);
        assert!(levels[1].amount_mg > levels[2].amount_mg);
    }

    #[test]
    fn intravenous_has_no_absorption_delay() {
        let now = Utc::now();
        let mut iv = intake("caffeine", now, 100.0);
        iv.route = Some("intravenous".to_string());
        let request = ToleranceRequest { intakes: vec![iv], time_points: vec![now] };

        let levels = calculate_blood_levels(request).unwrap().blood_levels;

        // The whole dose is in the blood immediately.
        assert!((levels[0].amount_mg - 100.0).abs() < 1e-6);
    }

    #[test]
    fn food_delays_the_peak() {
        let now = Utc::now();
        let mut fed = intake("ibuprofen", now, 400.0);
        fed.with_food = Some(true);
        let at_one_hour = vec![now + Duration::hours(1)];

        let fasted_level = calculate_blood_levels(ToleranceRequest {
            intakes: vec![intake("ibuprofen", now, 400.0)],
            time_points: at_one_hour.clone(),
        })
        .unwrap()
        .blood_levels[0]
            .amount_mg;

        let fed_level = calculate_blood_levels(ToleranceRequest {
            intakes: vec![fed],
            time_points: at_one_hour,
        })
        .unwrap()
        .blood_levels[0]
            .amount_mg;

        assert!(fed_level < fasted_level, "food should flatten the early curve");
    }

    #[test]
    fn ethanol_is_eliminated_at_a_near_constant_rate() {
        let now = Utc::now();
        // Four standard drinks, sampled once absorption is over and while the amount is
        // still well above Km — that is where the rate is genuinely near-constant. Two
        // drinks would be all but cleared by hour three and the rate would tail off.
        let request = ToleranceRequest {
            intakes: vec![intake("alcohol", now, 56_000.0)],
            time_points: vec![
                now + Duration::hours(2),
                now + Duration::hours(3),
                now + Duration::hours(4),
            ],
        };

        let levels = calculate_blood_levels(request).unwrap().blood_levels;
        let first_drop = levels[0].amount_mg - levels[1].amount_mg;
        let second_drop = levels[1].amount_mg - levels[2].amount_mg;

        assert!(first_drop > 0.0 && second_drop > 0.0);
        // Zero-order: equal time, near-equal loss. A first-order curve would halve it.
        let ratio = second_drop / first_drop;
        assert!(ratio > 0.85 && ratio < 1.15, "expected near-constant rate, ratio was {ratio}");
    }

    #[test]
    fn test_absorption_rate_from_tmax() {
        // Edge cases
        assert_eq!(absorption_rate_from_tmax(-1.0, 0.1), f64::INFINITY);
        assert_eq!(absorption_rate_from_tmax(0.0, 0.1), f64::INFINITY);
        assert_eq!(absorption_rate_from_tmax(f64::NAN, 0.1), f64::INFINITY);
        assert_eq!(absorption_rate_from_tmax(1.0, -0.1), f64::INFINITY);
        assert_eq!(absorption_rate_from_tmax(1.0, 0.0), f64::INFINITY);
        assert_eq!(absorption_rate_from_tmax(1.0, f64::NAN), f64::INFINITY);

        // Near-equal paths
        // When ka and ke are near equal, tmax_for uses 1.0 / ke.
        // Let ke = 2.0, so tmax = 0.5.
        // We expect absorption_rate_from_tmax(0.5, 2.0) to be approximately 2.0.
        let ka_near_equal = absorption_rate_from_tmax(0.5, 2.0);
        assert!((ka_near_equal - 2.0).abs() < 1e-3, "ka was {}", ka_near_equal);

        // Standard paths
        let tmax_for = |ka: f64, ke: f64| -> f64 {
            if (ka - ke).abs() < 1e-9 {
                1.0 / ke
            } else {
                (ka / ke).ln() / (ka - ke)
            }
        };

        let ke_standard = 0.1;
        let tmax_standard = 2.0;
        let ka_standard = absorption_rate_from_tmax(tmax_standard, ke_standard);

        let calculated_tmax = tmax_for(ka_standard, ke_standard);
        assert!(
            (calculated_tmax - tmax_standard).abs() < 1e-4,
            "calculated tmax was {}",
            calculated_tmax
        );
    }
}
