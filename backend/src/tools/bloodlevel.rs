use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

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
            elimination_route: Some("Hepatic metabolism (CYP1A2)".to_string()),
            bioavailability_percent: Some(99.0),
            elimination: Elimination::FirstOrder,
            vmax_mg_per_hour: 0.0,
            km_mg: 0.0,
            routes: Routes {
                oral: Some(RouteParams { bioavailability_percent: 99.0, tmax_hours: 0.75 }),
                intravenous: Some(RouteParams { bioavailability_percent: 100.0, tmax_hours: 0.0 }),
                nasal: None,
                inhaled: None,
                sublingual: None,
            },
            food: FoodEffect { tmax_factor: 1.5, bioavailability_factor: 1.0 },
        },
        Substance {
            id: "nicotine".to_string(),
            name: "Nicotine".to_string(),
            half_life_hours: 2.0,
            description: Some("Addictive stimulant found in tobacco; heavy first-pass metabolism by mouth".to_string()),
            category: Some("Stimulant".to_string()),
            common_dosage_mg: Some(1.0),
            max_daily_dose_mg: Some(4.0),
            elimination_route: Some("Hepatic metabolism (CYP2A6)".to_string()),
            bioavailability_percent: Some(30.0),
            elimination: Elimination::FirstOrder,
            vmax_mg_per_hour: 0.0,
            km_mg: 0.0,
            routes: Routes {
                oral: Some(RouteParams { bioavailability_percent: 30.0, tmax_hours: 1.0 }),
                intravenous: Some(RouteParams { bioavailability_percent: 100.0, tmax_hours: 0.0 }),
                nasal: Some(RouteParams { bioavailability_percent: 65.0, tmax_hours: 0.2 }),
                inhaled: Some(RouteParams { bioavailability_percent: 80.0, tmax_hours: 0.08 }),
                sublingual: Some(RouteParams { bioavailability_percent: 50.0, tmax_hours: 0.5 }),
            },
            food: FoodEffect { tmax_factor: 1.3, bioavailability_factor: 1.0 },
        },
        Substance {
            id: "alcohol".to_string(),
            name: "Alcohol (Ethanol)".to_string(),
            half_life_hours: 0.0,
            description: Some("Depressant. Eliminated at a near-constant rate rather than by a half-life - see the saturating model".to_string()),
            category: Some("Depressant".to_string()),
            common_dosage_mg: Some(14000.0),
            max_daily_dose_mg: Some(56000.0),
            elimination_route: Some("Hepatic alcohol dehydrogenase (saturable)".to_string()),
            bioavailability_percent: Some(90.0),
            elimination: Elimination::Saturating,
            vmax_mg_per_hour: 8500.0,
            km_mg: 3360.0,
            routes: Routes {
                oral: Some(RouteParams { bioavailability_percent: 90.0, tmax_hours: 0.5 }),
                intravenous: None,
                nasal: None,
                inhaled: None,
                sublingual: None,
            },
            food: FoodEffect { tmax_factor: 2.0, bioavailability_factor: 0.8 },
        },
        Substance {
            id: "ibuprofen".to_string(),
            name: "Ibuprofen".to_string(),
            half_life_hours: 2.0,
            description: Some("Non-steroidal anti-inflammatory drug".to_string()),
            category: Some("NSAID".to_string()),
            common_dosage_mg: Some(400.0),
            max_daily_dose_mg: Some(1200.0),
            elimination_route: Some("Hepatic metabolism (CYP2C9)".to_string()),
            bioavailability_percent: Some(90.0),
            elimination: Elimination::FirstOrder,
            vmax_mg_per_hour: 0.0,
            km_mg: 0.0,
            routes: Routes {
                oral: Some(RouteParams { bioavailability_percent: 90.0, tmax_hours: 1.0 }),
                intravenous: Some(RouteParams { bioavailability_percent: 100.0, tmax_hours: 0.0 }),
                nasal: None,
                inhaled: None,
                sublingual: None,
            },
            food: FoodEffect { tmax_factor: 2.0, bioavailability_factor: 1.0 },
        },
        Substance {
            id: "paracetamol".to_string(),
            name: "Acetaminophen (Paracetamol)".to_string(),
            half_life_hours: 2.3,
            description: Some("Pain reliever and fever reducer".to_string()),
            category: Some("Analgesic".to_string()),
            common_dosage_mg: Some(500.0),
            max_daily_dose_mg: Some(4000.0),
            elimination_route: Some("Hepatic conjugation".to_string()),
            bioavailability_percent: Some(88.0),
            elimination: Elimination::FirstOrder,
            vmax_mg_per_hour: 0.0,
            km_mg: 0.0,
            routes: Routes {
                oral: Some(RouteParams { bioavailability_percent: 88.0, tmax_hours: 0.75 }),
                intravenous: Some(RouteParams { bioavailability_percent: 100.0, tmax_hours: 0.0 }),
                nasal: None,
                inhaled: None,
                sublingual: None,
            },
            food: FoodEffect { tmax_factor: 2.0, bioavailability_factor: 1.0 },
        },
        Substance {
            id: "theobromine".to_string(),
            name: "Theobromine".to_string(),
            half_life_hours: 7.2,
            description: Some("Cocoa alkaloid, milder relative of caffeine".to_string()),
            category: Some("Stimulant".to_string()),
            common_dosage_mg: Some(200.0),
            max_daily_dose_mg: Some(1000.0),
            elimination_route: Some("Hepatic metabolism".to_string()),
            bioavailability_percent: Some(77.0),
            elimination: Elimination::FirstOrder,
            vmax_mg_per_hour: 0.0,
            km_mg: 0.0,
            routes: Routes {
                oral: Some(RouteParams { bioavailability_percent: 77.0, tmax_hours: 2.0 }),
                intravenous: None,
                nasal: None,
                inhaled: None,
                sublingual: None,
            },
            food: FoodEffect { tmax_factor: 1.5, bioavailability_factor: 1.0 },
        },
        Substance {
            id: "naproxen".to_string(),
            name: "Naproxen".to_string(),
            half_life_hours: 14.0,
            description: Some("Long-acting NSAID; the long half-life is why it is dosed twice daily".to_string()),
            category: Some("NSAID".to_string()),
            common_dosage_mg: Some(250.0),
            max_daily_dose_mg: Some(1000.0),
            elimination_route: Some("Hepatic metabolism".to_string()),
            bioavailability_percent: Some(95.0),
            elimination: Elimination::FirstOrder,
            vmax_mg_per_hour: 0.0,
            km_mg: 0.0,
            routes: Routes {
                oral: Some(RouteParams { bioavailability_percent: 95.0, tmax_hours: 2.0 }),
                intravenous: None,
                nasal: None,
                inhaled: None,
                sublingual: None,
            },
            food: FoodEffect { tmax_factor: 1.8, bioavailability_factor: 1.0 },
        },
        Substance {
            id: "aspirin".to_string(),
            name: "Aspirin (as salicylate)".to_string(),
            half_life_hours: 3.0,
            description: Some("Measured as salicylate: aspirin itself is hydrolysed within minutes".to_string()),
            category: Some("NSAID".to_string()),
            common_dosage_mg: Some(500.0),
            max_daily_dose_mg: Some(3000.0),
            elimination_route: Some("Hepatic and renal (dose-dependent)".to_string()),
            bioavailability_percent: Some(68.0),
            elimination: Elimination::FirstOrder,
            vmax_mg_per_hour: 0.0,
            km_mg: 0.0,
            routes: Routes {
                oral: Some(RouteParams { bioavailability_percent: 68.0, tmax_hours: 1.0 }),
                intravenous: None,
                nasal: None,
                inhaled: None,
                sublingual: None,
            },
            food: FoodEffect { tmax_factor: 2.0, bioavailability_factor: 1.0 },
        },
        Substance {
            id: "diphenhydramine".to_string(),
            name: "Diphenhydramine".to_string(),
            half_life_hours: 8.5,
            description: Some("Sedating antihistamine; heavy first-pass metabolism".to_string()),
            category: Some("Antihistamine".to_string()),
            common_dosage_mg: Some(25.0),
            max_daily_dose_mg: Some(150.0),
            elimination_route: Some("Hepatic metabolism (CYP2D6)".to_string()),
            bioavailability_percent: Some(43.0),
            elimination: Elimination::FirstOrder,
            vmax_mg_per_hour: 0.0,
            km_mg: 0.0,
            routes: Routes {
                oral: Some(RouteParams { bioavailability_percent: 43.0, tmax_hours: 2.0 }),
                intravenous: Some(RouteParams { bioavailability_percent: 100.0, tmax_hours: 0.0 }),
                nasal: None,
                inhaled: None,
                sublingual: None,
            },
            food: FoodEffect { tmax_factor: 1.3, bioavailability_factor: 1.0 },
        },
        Substance {
            id: "cetirizine".to_string(),
            name: "Cetirizine".to_string(),
            half_life_hours: 8.3,
            description: Some("Non-sedating antihistamine, largely excreted unchanged".to_string()),
            category: Some("Antihistamine".to_string()),
            common_dosage_mg: Some(10.0),
            max_daily_dose_mg: Some(10.0),
            elimination_route: Some("Renal excretion".to_string()),
            bioavailability_percent: Some(70.0),
            elimination: Elimination::FirstOrder,
            vmax_mg_per_hour: 0.0,
            km_mg: 0.0,
            routes: Routes {
                oral: Some(RouteParams { bioavailability_percent: 70.0, tmax_hours: 1.0 }),
                intravenous: None,
                nasal: None,
                inhaled: None,
                sublingual: None,
            },
            food: FoodEffect { tmax_factor: 1.7, bioavailability_factor: 1.0 },
        },
        Substance {
            id: "loratadine".to_string(),
            name: "Loratadine".to_string(),
            half_life_hours: 8.4,
            description: Some("Non-sedating antihistamine; its active metabolite lasts far longer than the parent".to_string()),
            category: Some("Antihistamine".to_string()),
            common_dosage_mg: Some(10.0),
            max_daily_dose_mg: Some(10.0),
            elimination_route: Some("Hepatic metabolism (CYP3A4/2D6)".to_string()),
            bioavailability_percent: Some(40.0),
            elimination: Elimination::FirstOrder,
            vmax_mg_per_hour: 0.0,
            km_mg: 0.0,
            routes: Routes {
                oral: Some(RouteParams { bioavailability_percent: 40.0, tmax_hours: 1.3 }),
                intravenous: None,
                nasal: None,
                inhaled: None,
                sublingual: None,
            },
            food: FoodEffect { tmax_factor: 1.5, bioavailability_factor: 1.0 },
        },
        Substance {
            id: "melatonin".to_string(),
            name: "Melatonin".to_string(),
            half_life_hours: 0.75,
            description: Some("Very short half-life and low oral bioavailability".to_string()),
            category: Some("Hormone".to_string()),
            common_dosage_mg: Some(3.0),
            max_daily_dose_mg: Some(10.0),
            elimination_route: Some("Hepatic metabolism (CYP1A2)".to_string()),
            bioavailability_percent: Some(15.0),
            elimination: Elimination::FirstOrder,
            vmax_mg_per_hour: 0.0,
            km_mg: 0.0,
            routes: Routes {
                oral: Some(RouteParams { bioavailability_percent: 15.0, tmax_hours: 0.75 }),
                intravenous: None,
                nasal: None,
                inhaled: None,
                sublingual: None,
            },
            food: FoodEffect { tmax_factor: 1.5, bioavailability_factor: 1.0 },
        },
        Substance {
            id: "pseudoephedrine".to_string(),
            name: "Pseudoephedrine".to_string(),
            half_life_hours: 5.5,
            description: Some("Decongestant; clearance is faster when urine is acidic".to_string()),
            category: Some("Decongestant".to_string()),
            common_dosage_mg: Some(60.0),
            max_daily_dose_mg: Some(240.0),
            elimination_route: Some("Renal excretion".to_string()),
            bioavailability_percent: Some(90.0),
            elimination: Elimination::FirstOrder,
            vmax_mg_per_hour: 0.0,
            km_mg: 0.0,
            routes: Routes {
                oral: Some(RouteParams { bioavailability_percent: 90.0, tmax_hours: 2.0 }),
                intravenous: None,
                nasal: None,
                inhaled: None,
                sublingual: None,
            },
            food: FoodEffect { tmax_factor: 1.5, bioavailability_factor: 1.0 },
        },
        Substance {
            id: "amoxicillin".to_string(),
            name: "Amoxicillin".to_string(),
            half_life_hours: 1.1,
            description: Some("Beta-lactam antibiotic cleared quickly by the kidneys".to_string()),
            category: Some("Antibiotic".to_string()),
            common_dosage_mg: Some(500.0),
            max_daily_dose_mg: Some(3000.0),
            elimination_route: Some("Renal excretion".to_string()),
            bioavailability_percent: Some(80.0),
            elimination: Elimination::FirstOrder,
            vmax_mg_per_hour: 0.0,
            km_mg: 0.0,
            routes: Routes {
                oral: Some(RouteParams { bioavailability_percent: 80.0, tmax_hours: 1.5 }),
                intravenous: Some(RouteParams { bioavailability_percent: 100.0, tmax_hours: 0.0 }),
                nasal: None,
                inhaled: None,
                sublingual: None,
            },
            food: FoodEffect { tmax_factor: 1.3, bioavailability_factor: 0.9 },
        },
        Substance {
            id: "metformin".to_string(),
            name: "Metformin".to_string(),
            half_life_hours: 6.2,
            description: Some("Antidiabetic excreted unchanged; accumulates if renal function is poor".to_string()),
            category: Some("Antidiabetic".to_string()),
            common_dosage_mg: Some(500.0),
            max_daily_dose_mg: Some(2000.0),
            elimination_route: Some("Renal excretion".to_string()),
            bioavailability_percent: Some(55.0),
            elimination: Elimination::FirstOrder,
            vmax_mg_per_hour: 0.0,
            km_mg: 0.0,
            routes: Routes {
                oral: Some(RouteParams { bioavailability_percent: 55.0, tmax_hours: 2.5 }),
                intravenous: None,
                nasal: None,
                inhaled: None,
                sublingual: None,
            },
            food: FoodEffect { tmax_factor: 1.4, bioavailability_factor: 0.9 },
        },
        Substance {
            id: "omeprazole".to_string(),
            name: "Omeprazole".to_string(),
            half_life_hours: 1.0,
            description: Some("Proton-pump inhibitor; its effect long outlasts its plasma half-life".to_string()),
            category: Some("Proton-pump inhibitor".to_string()),
            common_dosage_mg: Some(20.0),
            max_daily_dose_mg: Some(40.0),
            elimination_route: Some("Hepatic metabolism (CYP2C19)".to_string()),
            bioavailability_percent: Some(40.0),
            elimination: Elimination::FirstOrder,
            vmax_mg_per_hour: 0.0,
            km_mg: 0.0,
            routes: Routes {
                oral: Some(RouteParams { bioavailability_percent: 40.0, tmax_hours: 2.0 }),
                intravenous: Some(RouteParams { bioavailability_percent: 100.0, tmax_hours: 0.0 }),
                nasal: None,
                inhaled: None,
                sublingual: None,
            },
            food: FoodEffect { tmax_factor: 2.0, bioavailability_factor: 0.5 },
        },
        Substance {
            id: "sertraline".to_string(),
            name: "Sertraline".to_string(),
            half_life_hours: 26.0,
            description: Some("SSRI; the long half-life is why steady state takes about a week".to_string()),
            category: Some("SSRI".to_string()),
            common_dosage_mg: Some(50.0),
            max_daily_dose_mg: Some(200.0),
            elimination_route: Some("Hepatic metabolism".to_string()),
            bioavailability_percent: Some(44.0),
            elimination: Elimination::FirstOrder,
            vmax_mg_per_hour: 0.0,
            km_mg: 0.0,
            routes: Routes {
                oral: Some(RouteParams { bioavailability_percent: 44.0, tmax_hours: 6.0 }),
                intravenous: None,
                nasal: None,
                inhaled: None,
                sublingual: None,
            },
            food: FoodEffect { tmax_factor: 1.2, bioavailability_factor: 1.0 },
        },
    ]
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
        let substance_id_for_levels = substance.id.clone();
        let ke = elimination_rate(half_life_hours);

        // Resolve every dose once: bioavailable amount plus the absorption rate its route
        // and fed state imply.
        let doses: Vec<(DateTime<Utc>, f64, f64)> = intakes
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

        if substance.elimination == Elimination::Saturating {
            let origin = doses
                .iter()
                .map(|(t, _, _)| *t)
                .chain(request.time_points.iter().copied())
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
            let sample_hours: Vec<f64> = request.time_points.iter().map(|t| to_hours(*t)).collect();

            let amounts = simulate_saturating(
                &saturating,
                substance.vmax_mg_per_hour,
                substance.km_mg,
                &sample_hours,
                0.01,
            );

            for (i, &time_point) in request.time_points.iter().enumerate() {
                let amount = amounts.get(i).copied().unwrap_or(0.0);
                blood_levels.push(BloodLevelPoint {
                    time: time_point,
                    substance: substance_id_for_levels.clone(),
                    amount_mg: if amount.is_finite() { amount } else { 0.0 },
                });
            }
        } else {
            for &time_point in &request.time_points {
                let mut total_amount = 0.0;

                for (intake_time, bioavailable_dose, ka) in &doses {
                    let time_elapsed = time_point.signed_duration_since(*intake_time);
                    if time_elapsed.num_seconds() < 0 {
                        continue; // Future intake, skip
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
                blood_levels.push(BloodLevelPoint {
                    time: time_point,
                    substance: substance_id_for_levels.clone(),
                    amount_mg: safe_total_amount,
                });
            }
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
}
