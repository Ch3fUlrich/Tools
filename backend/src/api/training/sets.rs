use crate::middleware::session_middleware::AuthenticatedUser;
use crate::tools::training::{self, BodyMeasurements, SetEnergy, SetEnergyParams, Tempo};
use axum::extract::{Extension, Json, Path};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogSetRequest {
    pub exercise_id: String,
    pub set_number: i32,
    pub weight_kg: f64,
    pub reps: i32,
    pub rpe: Option<f64>,
    pub tempo_eccentric_s: Option<f64>,
    pub tempo_pause_bottom_s: Option<f64>,
    pub tempo_concentric_s: Option<f64>,
    pub tempo_pause_top_s: Option<f64>,
    pub is_warmup: Option<bool>,
    pub is_dropset: Option<bool>,
    pub is_failure: Option<bool>,
    pub rest_after_seconds: Option<i32>,
    pub notes: Option<String>,
}

pub async fn log_set(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Path(session_id): Path<String>,
    Json(req): Json<LogSetRequest>,
) -> impl IntoResponse {
    let session_uuid = match Uuid::parse_str(&session_id) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "invalid session_id"})))
                .into_response()
        }
    };
    let exercise_uuid = match Uuid::parse_str(&req.exercise_id) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "invalid exercise_id"})))
                .into_response()
        }
    };

    // Verify session belongs to user and is in_progress
    let session_check = sqlx::query(
        "SELECT measurement_id FROM workout_sessions WHERE id = $1 AND user_id = $2 AND status = 'in_progress'"
    )
    .bind(session_uuid)
    .bind(user.id)
    .fetch_optional(&*pool)
    .await;

    let measurement_id: Option<Uuid> = match session_check {
        Ok(Some(row)) => row.try_get("measurement_id").ok(),
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "session not found or not in_progress"})),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!("log_set session check failed: {e}");
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"})))
                .into_response();
        }
    };

    // Compute energy for this set
    let energy = compute_set_energy_for_log(&pool, exercise_uuid, measurement_id, &req).await;

    match sqlx::query(
        "INSERT INTO workout_sets (session_id, exercise_id, set_number, weight_kg, reps, rpe,
            tempo_eccentric_s, tempo_pause_bottom_s, tempo_concentric_s, tempo_pause_top_s,
            is_warmup, is_dropset, is_failure, rest_after_seconds,
            energy_kcal, energy_potential_kcal, energy_kinetic_kcal, energy_isometric_kcal, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         RETURNING id"
    )
    .bind(session_uuid)
    .bind(exercise_uuid)
    .bind(req.set_number)
    .bind(req.weight_kg)
    .bind(req.reps)
    .bind(req.rpe)
    .bind(req.tempo_eccentric_s.unwrap_or(2.0))
    .bind(req.tempo_pause_bottom_s.unwrap_or(0.0))
    .bind(req.tempo_concentric_s.unwrap_or(1.0))
    .bind(req.tempo_pause_top_s.unwrap_or(0.0))
    .bind(req.is_warmup.unwrap_or(false))
    .bind(req.is_dropset.unwrap_or(false))
    .bind(req.is_failure.unwrap_or(false))
    .bind(req.rest_after_seconds)
    .bind(energy.total_kcal)
    .bind(energy.potential_kcal)
    .bind(energy.kinetic_kcal)
    .bind(energy.isometric_kcal)
    .bind(&req.notes)
    .fetch_one(&*pool)
    .await
    {
        Ok(row) => {
            let id: Uuid = row.try_get("id").unwrap_or_default();
            (StatusCode::CREATED, Json(json!({
                "id": id.to_string(),
                "energyKcal": energy.total_kcal,
                "energyPotentialKcal": energy.potential_kcal,
                "energyKineticKcal": energy.kinetic_kcal,
                "energyIsometricKcal": energy.isometric_kcal,
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("log_set failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

/// Helper: compute energy for a set being logged, loading exercise + measurement data from DB.
async fn compute_set_energy_for_log(
    pool: &PgPool,
    exercise_id: Uuid,
    measurement_id: Option<Uuid>,
    req: &LogSetRequest,
) -> SetEnergy {
    // Load exercise data
    let exercise = sqlx::query(
        "SELECT movement_pattern, primary_segments_moved, rom_degrees, is_bodyweight, is_unilateral, body_mass_fraction_moved
         FROM exercises WHERE id = $1"
    )
    .bind(exercise_id)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    // Load measurements (from snapshot or latest)
    let measurement_row = if let Some(mid) = measurement_id {
        sqlx::query(
            "SELECT body_weight_kg, height_cm, upper_arm_length_cm, lower_arm_length_cm, upper_leg_length_cm, lower_leg_length_cm, torso_length_cm, arm_length_cm, leg_length_cm, shoulder_width_cm
             FROM body_measurements WHERE id = $1"
        )
        .bind(mid)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
    } else {
        None
    };

    let Some(ex) = exercise else {
        return SetEnergy {
            total_kcal: 0.0,
            potential_kcal: 0.0,
            kinetic_kcal: 0.0,
            isometric_kcal: 0.0,
            mechanical_work_joules: 0.0,
        };
    };

    let measurements = if let Some(mr) = measurement_row {
        let bd = |col: &str| -> Option<f64> {
            mr.try_get::<Option<sqlx::types::BigDecimal>, _>(col)
                .ok()
                .flatten()
                .and_then(|d| d.to_string().parse::<f64>().ok())
        };
        BodyMeasurements {
            body_weight_kg: bd("body_weight_kg").unwrap_or(75.0),
            height_cm: bd("height_cm"),
            upper_arm_length_cm: bd("upper_arm_length_cm"),
            lower_arm_length_cm: bd("lower_arm_length_cm"),
            upper_leg_length_cm: bd("upper_leg_length_cm"),
            lower_leg_length_cm: bd("lower_leg_length_cm"),
            torso_length_cm: bd("torso_length_cm"),
            arm_length_cm: bd("arm_length_cm"),
            leg_length_cm: bd("leg_length_cm"),
            shoulder_width_cm: bd("shoulder_width_cm"),
        }
    } else {
        // Default measurements
        BodyMeasurements {
            body_weight_kg: 75.0,
            height_cm: Some(175.0),
            upper_arm_length_cm: None,
            lower_arm_length_cm: None,
            upper_leg_length_cm: None,
            lower_leg_length_cm: None,
            torso_length_cm: None,
            arm_length_cm: None,
            leg_length_cm: None,
            shoulder_width_cm: None,
        }
    };

    let bd_ex = |col: &str| -> Option<f64> {
        ex.try_get::<Option<sqlx::types::BigDecimal>, _>(col)
            .ok()
            .flatten()
            .and_then(|d| d.to_string().parse::<f64>().ok())
    };

    let params = SetEnergyParams {
        weight_kg: req.weight_kg,
        reps: req.reps.max(0) as u32,
        movement_pattern: ex.try_get::<String, _>("movement_pattern").unwrap_or_default(),
        primary_segments_moved: ex
            .try_get::<Vec<String>, _>("primary_segments_moved")
            .unwrap_or_default(),
        rom_degrees: bd_ex("rom_degrees").unwrap_or(90.0),
        is_bodyweight: ex.try_get::<bool, _>("is_bodyweight").unwrap_or(false),
        is_unilateral: ex.try_get::<bool, _>("is_unilateral").unwrap_or(false),
        body_mass_fraction_moved: bd_ex("body_mass_fraction_moved").unwrap_or(0.0),
        measurements,
        tempo: Tempo {
            eccentric_s: req.tempo_eccentric_s.unwrap_or(2.0),
            pause_bottom_s: req.tempo_pause_bottom_s.unwrap_or(0.0),
            concentric_s: req.tempo_concentric_s.unwrap_or(1.0),
            pause_top_s: req.tempo_pause_top_s.unwrap_or(0.0),
        },
    };

    training::compute_set_energy(&params)
}

pub async fn delete_set(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Path((session_id, set_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let session_uuid = match Uuid::parse_str(&session_id) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "invalid session_id"})))
                .into_response()
        }
    };
    let set_uuid = match Uuid::parse_str(&set_id) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "invalid set_id"})))
                .into_response()
        }
    };

    // Verify ownership
    let owns = sqlx::query("SELECT 1 FROM workout_sessions WHERE id = $1 AND user_id = $2")
        .bind(session_uuid)
        .bind(user.id)
        .fetch_optional(&*pool)
        .await;
    if matches!(owns, Ok(None)) {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "session not found"})))
            .into_response();
    }

    match sqlx::query("DELETE FROM workout_sets WHERE id = $1 AND session_id = $2")
        .bind(set_uuid)
        .bind(session_uuid)
        .execute(&*pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                (StatusCode::NOT_FOUND, Json(json!({"error": "set not found"}))).into_response()
            } else {
                (StatusCode::OK, Json(json!({"ok": true}))).into_response()
            }
        }
        Err(e) => {
            tracing::error!("delete_set failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}
