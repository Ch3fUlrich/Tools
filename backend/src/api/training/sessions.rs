use super::*;
use crate::middleware::session_middleware::AuthenticatedUser;
use axum::extract::{Extension, Json, Path, Query};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartSessionRequest {
    pub name: String,
    pub plan_id: Option<String>,
}

pub async fn start_session(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Json(req): Json<StartSessionRequest>,
) -> impl IntoResponse {
    let plan_uuid = req.plan_id.as_deref().and_then(|s| Uuid::parse_str(s).ok());

    // Snapshot latest measurement
    let measurement_id: Option<Uuid> = sqlx::query(
        "SELECT id FROM body_measurements WHERE user_id = $1 ORDER BY measured_at DESC LIMIT 1",
    )
    .bind(user.id)
    .fetch_optional(&*pool)
    .await
    .ok()
    .flatten()
    .and_then(|row| row.try_get("id").ok());

    match sqlx::query(
        "INSERT INTO workout_sessions (user_id, plan_id, measurement_id, name) VALUES ($1, $2, $3, $4) RETURNING id, started_at"
    )
    .bind(user.id)
    .bind(plan_uuid)
    .bind(measurement_id)
    .bind(&req.name)
    .fetch_one(&*pool)
    .await
    {
        Ok(row) => {
            let id: Uuid = row.try_get("id").unwrap_or_default();
            let started_at: chrono::DateTime<chrono::Utc> = row.try_get("started_at").unwrap_or_else(|_| chrono::Utc::now());
            (StatusCode::CREATED, Json(json!({
                "id": id.to_string(),
                "startedAt": started_at.to_rfc3339(),
                "measurementId": measurement_id.map(|m| m.to_string()),
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("start_session failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

pub async fn list_sessions(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Query(params): Query<StatsFilterParams>,
) -> impl IntoResponse {
    match sqlx::query(
        "SELECT id, name, plan_id, started_at, completed_at, status, total_energy_kcal, total_volume_kg, notes
         FROM workout_sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 100"
    )
    .bind(user.id)
    .fetch_all(&*pool)
    .await
    {
        Ok(rows) => {
            let sessions: Vec<serde_json::Value> = rows.iter().filter(|row| {
                // Apply date filters
                let started: Option<chrono::DateTime<chrono::Utc>> = row.try_get("started_at").ok();
                let matches_from = params.from.as_ref().is_none_or(|f| {
                    chrono::DateTime::parse_from_rfc3339(f).ok()
                        .is_none_or(|from| started.is_some_and(|s| s >= from))
                });
                let matches_to = params.to.as_ref().is_none_or(|t| {
                    chrono::DateTime::parse_from_rfc3339(t).ok()
                        .is_none_or(|to| started.is_some_and(|s| s <= to))
                });
                matches_from && matches_to
            }).map(|row| {
                json!({
                    "id": row.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
                    "name": row.try_get::<String, _>("name").unwrap_or_default(),
                    "planId": row.try_get::<Option<Uuid>, _>("plan_id").ok().flatten().map(|u| u.to_string()),
                    "startedAt": row.try_get::<chrono::DateTime<chrono::Utc>, _>("started_at").ok().map(|d| d.to_rfc3339()),
                    "completedAt": row.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("completed_at").ok().flatten().map(|d| d.to_rfc3339()),
                    "status": row.try_get::<String, _>("status").unwrap_or_default(),
                    "totalEnergyKcal": row.try_get::<Option<sqlx::types::BigDecimal>, _>("total_energy_kcal").ok().flatten().map(|d| d.to_string()),
                    "totalVolumeKg": row.try_get::<Option<sqlx::types::BigDecimal>, _>("total_volume_kg").ok().flatten().map(|d| d.to_string()),
                    "notes": row.try_get::<Option<String>, _>("notes").ok().flatten(),
                })
            }).collect();
            (StatusCode::OK, Json(json!({"sessions": sessions}))).into_response()
        }
        Err(e) => {
            tracing::error!("list_sessions failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

pub async fn get_session(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "invalid id"}))).into_response()
        }
    };

    let session = sqlx::query(
        "SELECT id, name, plan_id, measurement_id, started_at, completed_at, status, total_energy_kcal, total_volume_kg, notes
         FROM workout_sessions WHERE id = $1 AND user_id = $2"
    )
    .bind(uuid)
    .bind(user.id)
    .fetch_optional(&*pool)
    .await;

    let sets = sqlx::query(
        "SELECT ws.id, ws.exercise_id, e.name as exercise_name, ws.set_number, ws.weight_kg, ws.reps, ws.rpe,
                ws.tempo_eccentric_s, ws.tempo_pause_bottom_s, ws.tempo_concentric_s, ws.tempo_pause_top_s,
                ws.is_warmup, ws.is_dropset, ws.is_failure, ws.rest_after_seconds,
                ws.energy_kcal, ws.energy_potential_kcal, ws.energy_kinetic_kcal, ws.energy_isometric_kcal,
                ws.notes, ws.performed_at
         FROM workout_sets ws JOIN exercises e ON e.id = ws.exercise_id
         WHERE ws.session_id = $1 ORDER BY ws.performed_at, ws.set_number"
    )
    .bind(uuid)
    .fetch_all(&*pool)
    .await;

    match (session, sets) {
        (Ok(Some(row)), Ok(set_rows)) => {
            let sets_json: Vec<serde_json::Value> = set_rows.iter().map(|sr| {
                json!({
                    "id": sr.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
                    "exerciseId": sr.try_get::<Uuid, _>("exercise_id").unwrap_or_default().to_string(),
                    "exerciseName": sr.try_get::<String, _>("exercise_name").unwrap_or_default(),
                    "setNumber": sr.try_get::<i32, _>("set_number").unwrap_or(0),
                    "weightKg": sr.try_get::<sqlx::types::BigDecimal, _>("weight_kg").ok().map(|d| d.to_string()),
                    "reps": sr.try_get::<i32, _>("reps").unwrap_or(0),
                    "rpe": sr.try_get::<Option<sqlx::types::BigDecimal>, _>("rpe").ok().flatten().map(|d| d.to_string()),
                    "tempoEccentricS": sr.try_get::<Option<sqlx::types::BigDecimal>, _>("tempo_eccentric_s").ok().flatten().map(|d| d.to_string()),
                    "tempoPauseBottomS": sr.try_get::<Option<sqlx::types::BigDecimal>, _>("tempo_pause_bottom_s").ok().flatten().map(|d| d.to_string()),
                    "tempoConcentricS": sr.try_get::<Option<sqlx::types::BigDecimal>, _>("tempo_concentric_s").ok().flatten().map(|d| d.to_string()),
                    "tempoPauseTopS": sr.try_get::<Option<sqlx::types::BigDecimal>, _>("tempo_pause_top_s").ok().flatten().map(|d| d.to_string()),
                    "isWarmup": sr.try_get::<bool, _>("is_warmup").unwrap_or(false),
                    "isDropset": sr.try_get::<bool, _>("is_dropset").unwrap_or(false),
                    "isFailure": sr.try_get::<bool, _>("is_failure").unwrap_or(false),
                    "energyKcal": sr.try_get::<Option<sqlx::types::BigDecimal>, _>("energy_kcal").ok().flatten().map(|d| d.to_string()),
                    "energyPotentialKcal": sr.try_get::<Option<sqlx::types::BigDecimal>, _>("energy_potential_kcal").ok().flatten().map(|d| d.to_string()),
                    "energyKineticKcal": sr.try_get::<Option<sqlx::types::BigDecimal>, _>("energy_kinetic_kcal").ok().flatten().map(|d| d.to_string()),
                    "energyIsometricKcal": sr.try_get::<Option<sqlx::types::BigDecimal>, _>("energy_isometric_kcal").ok().flatten().map(|d| d.to_string()),
                    "notes": sr.try_get::<Option<String>, _>("notes").ok().flatten(),
                    "performedAt": sr.try_get::<chrono::DateTime<chrono::Utc>, _>("performed_at").ok().map(|d| d.to_rfc3339()),
                })
            }).collect();

            (StatusCode::OK, Json(json!({
                "id": row.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
                "name": row.try_get::<String, _>("name").unwrap_or_default(),
                "planId": row.try_get::<Option<Uuid>, _>("plan_id").ok().flatten().map(|u| u.to_string()),
                "measurementId": row.try_get::<Option<Uuid>, _>("measurement_id").ok().flatten().map(|u| u.to_string()),
                "startedAt": row.try_get::<chrono::DateTime<chrono::Utc>, _>("started_at").ok().map(|d| d.to_rfc3339()),
                "completedAt": row.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("completed_at").ok().flatten().map(|d| d.to_rfc3339()),
                "status": row.try_get::<String, _>("status").unwrap_or_default(),
                "totalEnergyKcal": row.try_get::<Option<sqlx::types::BigDecimal>, _>("total_energy_kcal").ok().flatten().map(|d| d.to_string()),
                "totalVolumeKg": row.try_get::<Option<sqlx::types::BigDecimal>, _>("total_volume_kg").ok().flatten().map(|d| d.to_string()),
                "notes": row.try_get::<Option<String>, _>("notes").ok().flatten(),
                "sets": sets_json,
            }))).into_response()
        }
        (Ok(None), _) => {
            (StatusCode::NOT_FOUND, Json(json!({"error": "session not found"}))).into_response()
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("get_session failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSessionRequest {
    pub status: Option<String>,
    pub notes: Option<String>,
}

pub async fn update_session(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Path(id): Path<String>,
    Json(req): Json<UpdateSessionRequest>,
) -> impl IntoResponse {
    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "invalid id"}))).into_response()
        }
    };

    let completed_at =
        if req.status.as_deref() == Some("completed") { Some(chrono::Utc::now()) } else { None };

    // Update session
    match sqlx::query(
        "UPDATE workout_sessions SET
            status = COALESCE($1, status),
            notes = COALESCE($2, notes),
            completed_at = COALESCE($3, completed_at),
            updated_at = now()
         WHERE id = $4 AND user_id = $5",
    )
    .bind(&req.status)
    .bind(&req.notes)
    .bind(completed_at)
    .bind(uuid)
    .bind(user.id)
    .execute(&*pool)
    .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                return (StatusCode::NOT_FOUND, Json(json!({"error": "not found"})))
                    .into_response();
            }

            // If completing, recalculate totals
            if req.status.as_deref() == Some("completed") {
                let _ = recalculate_session_totals(&pool, uuid).await;
            }

            (StatusCode::OK, Json(json!({"ok": true}))).into_response()
        }
        Err(e) => {
            tracing::error!("update_session failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

async fn recalculate_session_totals(pool: &PgPool, session_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE workout_sessions SET
            total_energy_kcal = (SELECT COALESCE(SUM(energy_kcal), 0) FROM workout_sets WHERE session_id = $1),
            total_volume_kg = (SELECT COALESCE(SUM(weight_kg * reps), 0) FROM workout_sets WHERE session_id = $1),
            updated_at = now()
         WHERE id = $1"
    )
    .bind(session_id)
    .execute(pool)
    .await?;
    Ok(())
}
