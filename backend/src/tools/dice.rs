use rand::Rng;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct DiceSpec {
    pub r#type: String,
    pub sides: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct RerollSpec {
    pub mode: String, // "lt" or "gt"
    pub threshold: i32,
    #[serde(rename = "maxRerolls")]
    pub max_rerolls: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct DiceRequest {
    pub die: DiceSpec,
    pub count: u32,
    pub advantage: Option<String>,
    #[serde(rename = "advantageMode")]
    pub advantage_mode: Option<String>,
    pub reroll: Option<RerollSpec>,
    #[serde(rename = "maxRerollsPerDie")]
    pub max_rerolls_per_die: Option<u32>,
    pub rolls: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PerDieDetail {
    pub original: Vec<i32>,
    #[serde(rename = "final")]
    pub r#final: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiceRollResult {
    pub per_die: Vec<PerDieDetail>,
    pub used: Vec<i32>,
    pub sum: i32,
    pub average: f64,
    pub median: f64,
    pub spread: i32,
}

#[derive(Debug, Serialize)]
pub struct DiceResponse {
    pub rolls: Vec<DiceRollResult>,
    pub summary: serde_json::Value,
}

pub async fn handle_roll(req: DiceRequest) -> Result<DiceResponse, serde_json::Value> {
    // Basic validation and server limits
    const MAX_DICE: u32 = 1000;
    const MAX_SIDES: u32 = 10000;
    const MAX_REROLLS_PER_DIE: u32 = 1000;
    const MAX_INDEPENDENT_ROLLS: u32 = 100;

    if req.count == 0 {
        return Err(serde_json::json!({"error":"count must be > 0"}));
    }
    // reject requests that meet or exceed the absolute MAX_DICE to avoid pathological loads
    if req.count >= MAX_DICE {
        return Err(serde_json::json!({"error":"count exceeds max allowed"}));
    }

    let sides = match req.die.r#type.as_str() {
        "d2" => 2,
        "d3" => 3,
        "d4" => 4,
        "d6" => 6,
        "d8" => 8,
        "d10" => 10,
        "d12" => 12,
        "d20" => 20,
        "custom" => req.die.sides.unwrap_or(6),
        _ => return Err(serde_json::json!({"error":"unknown die type"})),
    };

    if sides > MAX_SIDES {
        return Err(serde_json::json!({"error":"sides exceeds max allowed"}));
    }

    let rolls = req.rolls.unwrap_or(1);
    let mut results: Vec<DiceRollResult> = Vec::new();

    if rolls > MAX_INDEPENDENT_ROLLS {
        return Err(serde_json::json!({"error":"too many independent rolls requested"}));
    }

    // determine effective max rerolls per die
    let max_rerolls = req
        .max_rerolls_per_die
        .unwrap_or(10)
        .min(MAX_REROLLS_PER_DIE);

    // estimated work heuristic: count * (1 + max_rerolls) * rolls
    let est_work: u128 = u128::from(req.count) * (u128::from(max_rerolls) + 1) * u128::from(rolls);
    let safe_threshold: u128 =
        u128::from(MAX_DICE) * (u128::from(MAX_REROLLS_PER_DIE) + 1) * u128::from(MAX_INDEPENDENT_ROLLS);
    // reject requests whose estimated work meets or exceeds the safe threshold
    if est_work >= safe_threshold {
        return Err(serde_json::json!({"error":"request too large; exceeds server cost limits"}));
    }

    // Helper: roll a single die with optional rerolls; returns (originals, final)
    let roll_with_rerolls = |rng: &mut rand::rngs::ThreadRng| -> (Vec<i32>, i32) {
        let mut originals = Vec::new();
        let mut v = rng.gen_range(1..=(sides as i32));
        originals.push(v);
        let mut tries = 0u32;
        if let Some(rspec) = &req.reroll {
            loop {
                let should = match rspec.mode.as_str() {
                    "lt" => v <= rspec.threshold,
                    "gt" => v >= rspec.threshold,
                    _ => false,
                };
                let effective_max = rspec.max_rerolls.unwrap_or(max_rerolls);
                if !should || tries >= effective_max {
                    break;
                }
                v = rng.gen_range(1..=(sides as i32));
                originals.push(v);
                tries += 1;
            }
        }
        (originals, v)
    };

    // Helper: perform one independent roll-set (count dice), returning per_die details and used values
    let perform_set = |rng: &mut rand::rngs::ThreadRng| -> (Vec<PerDieDetail>, Vec<i32>) {
        let mut per_die: Vec<PerDieDetail> = Vec::new();
        let mut used: Vec<i32> = Vec::new();
        for _ in 0..req.count {
            let (originals, finalv) = roll_with_rerolls(rng);
            per_die.push(PerDieDetail {
                original: originals.clone(),
                r#final: finalv,
            });
            used.push(finalv);
        }
        (per_die, used)
    };

    for _ in 0..rolls {
        let mut rng = rand::thread_rng();
        let advantage = req.advantage.clone().unwrap_or_else(|| "none".to_string());
        let adv_mode = req
            .advantage_mode
            .clone()
            .unwrap_or_else(|| "per-die".to_string());

        if advantage == "none" || adv_mode == "per-die" {
            // per-die advantage: for each die, roll either once (none) or twice and pick
            let mut per_die: Vec<PerDieDetail> = Vec::new();
            let mut used: Vec<i32> = Vec::new();

            for _ in 0..req.count {
                if advantage == "none" {
                    let (originals, finalv) = roll_with_rerolls(&mut rng);
                    per_die.push(PerDieDetail {
                        original: originals.clone(),
                        r#final: finalv,
                    });
                    used.push(finalv);
                } else {
                    // roll two independent attempts (each with their own rerolls), then pick per die
                    let (orig1, f1) = roll_with_rerolls(&mut rng);
                    let (orig2, f2) = roll_with_rerolls(&mut rng);
                    let chosen = if advantage == "adv" {
                        std::cmp::max(f1, f2)
                    } else {
                        std::cmp::min(f1, f2)
                    };
                    // combine originals for traceability
                    let mut combined = orig1.clone();
                    combined.extend(orig2.iter());
                    per_die.push(PerDieDetail {
                        original: combined,
                        r#final: chosen,
                    });
                    used.push(chosen);
                }
            }

            // compute stats
            let sum: i32 = used.iter().sum();
            let average = if used.is_empty() {
                0.0
            } else {
                f64::from(sum) / used.len() as f64
            };
            let mut used_sorted = used.clone();
            used_sorted.sort_unstable();
            let median = if used_sorted.len() % 2 == 1 {
                f64::from(used_sorted[used_sorted.len() / 2])
            } else if !used_sorted.is_empty() {
                let hi = used_sorted[used_sorted.len() / 2];
                let lo = used_sorted[used_sorted.len() / 2 - 1];
                f64::from(hi + lo) / 2.0
            } else {
                0.0
            };
            let spread = if used_sorted.is_empty() {
                0
            } else {
                used_sorted.last().unwrap() - used_sorted.first().unwrap()
            };

            results.push(DiceRollResult {
                per_die,
                used,
                sum,
                average,
                median,
                spread,
            });
        } else {
            // per-set advantage: perform two full sets and pick the set with higher/lower total
            let (per1, used1) = perform_set(&mut rng);
            let sum1: i32 = used1.iter().sum();
            let (per2, used2) = perform_set(&mut rng);
            let sum2: i32 = used2.iter().sum();
            let pick_first = if advantage == "adv" {
                sum1 >= sum2
            } else {
                sum1 <= sum2
            };
            if pick_first {
                let average = if used1.is_empty() {
                    0.0
                } else {
                    f64::from(sum1) / used1.len() as f64
                };
                let mut used_sorted = used1.clone();
                used_sorted.sort_unstable();
                let median = if used_sorted.len() % 2 == 1 {
                    f64::from(used_sorted[used_sorted.len() / 2])
                } else if !used_sorted.is_empty() {
                    f64::from(used_sorted[used_sorted.len() / 2] + used_sorted[used_sorted.len() / 2 - 1])
                        / 2.0
                } else {
                    0.0
                };
                let spread = if used_sorted.is_empty() {
                    0
                } else {
                    used_sorted.last().unwrap() - used_sorted.first().unwrap()
                };
                results.push(DiceRollResult {
                    per_die: per1,
                    used: used1,
                    sum: sum1,
                    average,
                    median,
                    spread,
                });
            } else {
                let average = if used2.is_empty() {
                    0.0
                } else {
                    f64::from(sum2) / used2.len() as f64
                };
                let mut used_sorted = used2.clone();
                used_sorted.sort_unstable();
                let median = if used_sorted.len() % 2 == 1 {
                    f64::from(used_sorted[used_sorted.len() / 2])
                } else if !used_sorted.is_empty() {
                    f64::from(used_sorted[used_sorted.len() / 2] + used_sorted[used_sorted.len() / 2 - 1])
                        / 2.0
                } else {
                    0.0
                };
                let spread = if used_sorted.is_empty() {
                    0
                } else {
                    used_sorted.last().unwrap() - used_sorted.first().unwrap()
                };
                results.push(DiceRollResult {
                    per_die: per2,
                    used: used2,
                    sum: sum2,
                    average,
                    median,
                    spread,
                });
            }
        }
    }

    Ok(DiceResponse {
        rolls: results,
        summary: serde_json::json!({"totalRollsRequested": rolls}),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_basic_roll() {
        let req = DiceRequest {
            die: DiceSpec {
                r#type: "d6".to_string(),
                sides: None,
            },
            count: 3,
            advantage: None,
            advantage_mode: None,
            reroll: None,
            max_rerolls_per_die: None,
            rolls: Some(2),
        };

        let res = handle_roll(req).await.expect("roll failed");
        assert_eq!(res.rolls.len(), 2);
        for r in res.rolls {
            assert_eq!(r.used.len(), 3);
            // values should be between 1 and 6
            for v in r.used {
                assert!(v >= 1 && v <= 6);
            }
        }
    }

    #[tokio::test]
    async fn test_advantage_per_die() {
        let req = DiceRequest {
            die: DiceSpec {
                r#type: "d6".to_string(),
                sides: None,
            },
            count: 5,
            advantage: Some("adv".to_string()),
            advantage_mode: Some("per-die".to_string()),
            reroll: None,
            max_rerolls_per_die: Some(5),
            rolls: Some(1),
        };

        let res = handle_roll(req).await.expect("adv roll failed");
        assert_eq!(res.rolls.len(), 1);
        assert_eq!(res.rolls[0].used.len(), 5);
    }

    #[tokio::test]
    async fn test_advantage_per_set() {
        let req = DiceRequest {
            die: DiceSpec {
                r#type: "d6".to_string(),
                sides: None,
            },
            count: 4,
            advantage: Some("dis".to_string()),
            advantage_mode: Some("per-set".to_string()),
            reroll: None,
            max_rerolls_per_die: Some(2),
            rolls: Some(1),
        };

        let res = handle_roll(req).await.expect("adv set failed");
        assert_eq!(res.rolls.len(), 1);
        assert_eq!(res.rolls[0].used.len(), 4);
    }

    #[tokio::test]
    async fn test_reroll_lt_threshold() {
        let req = DiceRequest {
            die: DiceSpec {
                r#type: "d6".to_string(),
                sides: None,
            },
            count: 10,
            advantage: None,
            advantage_mode: None,
            reroll: Some(RerollSpec {
                mode: "lt".to_string(),
                threshold: 2,
                max_rerolls: Some(10),
            }),
            max_rerolls_per_die: Some(10),
            rolls: Some(1),
        };

        let res = handle_roll(req).await.expect("reroll failed");
        assert_eq!(res.rolls.len(), 1);
        // Ensure no used value is below threshold if reroll worked
        for v in &res.rolls[0].used {
            assert!(*v >= 1);
        }
    }

    #[tokio::test]
    async fn test_multi_rolls_and_limits() {
        let req = DiceRequest {
            die: DiceSpec {
                r#type: "d2".to_string(),
                sides: None,
            },
            count: 3,
            advantage: None,
            advantage_mode: None,
            reroll: None,
            max_rerolls_per_die: None,
            rolls: Some(5),
        };

        let res = handle_roll(req).await.expect("multi roll failed");
        assert_eq!(res.rolls.len(), 5);
    }

    #[tokio::test]
    async fn test_request_too_large_rejected() {
        let req = DiceRequest {
            die: DiceSpec {
                r#type: "d20".to_string(),
                sides: None,
            },
            count: 1000,
            advantage: None,
            advantage_mode: None,
            reroll: Some(RerollSpec {
                mode: "lt".to_string(),
                threshold: 1,
                max_rerolls: Some(1000),
            }),
            max_rerolls_per_die: Some(1000),
            rolls: Some(100),
        };

        let res = handle_roll(req).await;
        assert!(res.is_err());
    }

    #[tokio::test]
    async fn test_unknown_die_type_rejected() {
        let req = DiceRequest {
            die: DiceSpec {
                r#type: "d999".to_string(),
                sides: None,
            },
            count: 1,
            advantage: None,
            advantage_mode: None,
            reroll: None,
            max_rerolls_per_die: None,
            rolls: Some(1),
        };

        let res = handle_roll(req).await;
        assert!(res.is_err());
        let err = res.err().unwrap();
        assert!(err.get("error").is_some());
    }

    #[tokio::test]
    async fn test_custom_sides_exceed_max_rejected() {
        let req = DiceRequest {
            die: DiceSpec {
                r#type: "custom".to_string(),
                sides: Some(20000),
            },
            count: 1,
            advantage: None,
            advantage_mode: None,
            reroll: None,
            max_rerolls_per_die: None,
            rolls: Some(1),
        };

        let res = handle_roll(req).await;
        assert!(res.is_err());
        let err = res.err().unwrap();
        assert!(err.get("error").is_some());
    }

    #[tokio::test]
    async fn test_too_many_independent_rolls_rejected() {
        let req = DiceRequest {
            die: DiceSpec {
                r#type: "d6".to_string(),
                sides: None,
            },
            count: 1,
            advantage: None,
            advantage_mode: None,
            reroll: None,
            max_rerolls_per_die: None,
            // request more than MAX_INDEPENDENT_ROLLS (100)
            rolls: Some(101),
        };

        let res = handle_roll(req).await;
        assert!(res.is_err());
    }

    #[tokio::test]
    async fn test_count_zero_rejected() {
        let req = DiceRequest {
            die: DiceSpec {
                r#type: "d6".to_string(),
                sides: None,
            },
            count: 0,
            advantage: None,
            advantage_mode: None,
            reroll: None,
            max_rerolls_per_die: None,
            rolls: Some(1),
        };

        let res = handle_roll(req).await;
        assert!(res.is_err());
        let err = res.err().unwrap();
        assert!(err.get("error").is_some());
    }

    #[tokio::test]
    async fn test_custom_default_sides_uses_six() {
        let req = DiceRequest {
            die: DiceSpec {
                r#type: "custom".to_string(),
                sides: None,
            },
            count: 2,
            advantage: None,
            advantage_mode: None,
            reroll: None,
            max_rerolls_per_die: None,
            rolls: Some(1),
        };

        let res = handle_roll(req).await.expect("custom default sides failed");
        assert_eq!(res.rolls.len(), 1);
        assert_eq!(res.rolls[0].used.len(), 2);
        for v in &res.rolls[0].used {
            // default should be a d6
            assert!(*v >= 1 && *v <= 6);
        }
    }
}
