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
pub struct CreateMeasurementRequest {
    pub body_weight_kg: f64,
    pub height_cm: Option<f64>,
    pub leg_length_cm: Option<f64>,
    pub upper_leg_length_cm: Option<f64>,
    pub lower_leg_length_cm: Option<f64>,
    pub arm_length_cm: Option<f64>,
    pub upper_arm_length_cm: Option<f64>,
    pub lower_arm_length_cm: Option<f64>,
    pub torso_length_cm: Option<f64>,
    pub shoulder_width_cm: Option<f64>,
    pub measured_at: Option<String>,
}

pub async fn create_measurement(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Json(req): Json<CreateMeasurementRequest>,
) -> impl IntoResponse {
    if req.body_weight_kg <= 0.0 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "body_weight_kg must be positive"})),
        )
            .into_response();
    }

    let measured_at = req
        .measured_at
        .as_deref()
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&chrono::Utc))
        .unwrap_or_else(chrono::Utc::now);

    match sqlx::query(
        "INSERT INTO body_measurements (user_id, measured_at, body_weight_kg, height_cm, leg_length_cm, upper_leg_length_cm, lower_leg_length_cm, arm_length_cm, upper_arm_length_cm, lower_arm_length_cm, torso_length_cm, shoulder_width_cm)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id"
    )
    .bind(user.id)
    .bind(measured_at)
    .bind(req.body_weight_kg)
    .bind(req.height_cm)
    .bind(req.leg_length_cm)
    .bind(req.upper_leg_length_cm)
    .bind(req.lower_leg_length_cm)
    .bind(req.arm_length_cm)
    .bind(req.upper_arm_length_cm)
    .bind(req.lower_arm_length_cm)
    .bind(req.torso_length_cm)
    .bind(req.shoulder_width_cm)
    .fetch_one(&*pool)
    .await
    {
        Ok(row) => {
            let id: Uuid = row.try_get("id").unwrap_or_default();
            (StatusCode::CREATED, Json(json!({"id": id.to_string()}))).into_response()
        }
        Err(e) => {
            tracing::error!("create_measurement failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

pub async fn list_measurements(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Query(params): Query<PaginationParams>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(50).min(200);
    let offset = params.offset.unwrap_or(0);

    match sqlx::query(
        "SELECT id, measured_at, body_weight_kg, height_cm, leg_length_cm, upper_leg_length_cm, lower_leg_length_cm, arm_length_cm, upper_arm_length_cm, lower_arm_length_cm, torso_length_cm, shoulder_width_cm, created_at
         FROM body_measurements WHERE user_id = $1 ORDER BY measured_at DESC LIMIT $2 OFFSET $3"
    )
    .bind(user.id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&*pool)
    .await
    {
        Ok(rows) => {
            let measurements: Vec<serde_json::Value> = rows.iter().map(|row| {
                json!({
                    "id": row.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
                    "measuredAt": row.try_get::<chrono::DateTime<chrono::Utc>, _>("measured_at").ok().map(|d| d.to_rfc3339()),
                    "bodyWeightKg": row.try_get::<sqlx::types::BigDecimal, _>("body_weight_kg").ok().map(|d| d.to_string()),
                    "heightCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("height_cm").ok().flatten().map(|d| d.to_string()),
                    "legLengthCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("leg_length_cm").ok().flatten().map(|d| d.to_string()),
                    "upperLegLengthCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("upper_leg_length_cm").ok().flatten().map(|d| d.to_string()),
                    "lowerLegLengthCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("lower_leg_length_cm").ok().flatten().map(|d| d.to_string()),
                    "armLengthCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("arm_length_cm").ok().flatten().map(|d| d.to_string()),
                    "upperArmLengthCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("upper_arm_length_cm").ok().flatten().map(|d| d.to_string()),
                    "lowerArmLengthCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("lower_arm_length_cm").ok().flatten().map(|d| d.to_string()),
                    "torsoLengthCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("torso_length_cm").ok().flatten().map(|d| d.to_string()),
                    "shoulderWidthCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("shoulder_width_cm").ok().flatten().map(|d| d.to_string()),
                })
            }).collect();
            (StatusCode::OK, Json(json!({"measurements": measurements}))).into_response()
        }
        Err(e) => {
            tracing::error!("list_measurements failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

pub async fn latest_measurement(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
) -> impl IntoResponse {
    match sqlx::query(
        "SELECT id, measured_at, body_weight_kg, height_cm, leg_length_cm, upper_leg_length_cm, lower_leg_length_cm, arm_length_cm, upper_arm_length_cm, lower_arm_length_cm, torso_length_cm, shoulder_width_cm
         FROM body_measurements WHERE user_id = $1 ORDER BY measured_at DESC LIMIT 1"
    )
    .bind(user.id)
    .fetch_optional(&*pool)
    .await
    {
        Ok(Some(row)) => {
            (StatusCode::OK, Json(json!({
                "id": row.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
                "bodyWeightKg": row.try_get::<sqlx::types::BigDecimal, _>("body_weight_kg").ok().map(|d| d.to_string()),
                "heightCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("height_cm").ok().flatten().map(|d| d.to_string()),
                "upperArmLengthCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("upper_arm_length_cm").ok().flatten().map(|d| d.to_string()),
                "lowerArmLengthCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("lower_arm_length_cm").ok().flatten().map(|d| d.to_string()),
                "upperLegLengthCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("upper_leg_length_cm").ok().flatten().map(|d| d.to_string()),
                "lowerLegLengthCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("lower_leg_length_cm").ok().flatten().map(|d| d.to_string()),
                "torsoLengthCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("torso_length_cm").ok().flatten().map(|d| d.to_string()),
                "legLengthCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("leg_length_cm").ok().flatten().map(|d| d.to_string()),
                "armLengthCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("arm_length_cm").ok().flatten().map(|d| d.to_string()),
                "shoulderWidthCm": row.try_get::<Option<sqlx::types::BigDecimal>, _>("shoulder_width_cm").ok().flatten().map(|d| d.to_string()),
            }))).into_response()
        }
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"error": "no measurements found"}))).into_response(),
        Err(e) => {
            tracing::error!("latest_measurement failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

pub async fn delete_measurement(
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
    match sqlx::query("DELETE FROM body_measurements WHERE id = $1 AND user_id = $2")
        .bind(uuid)
        .bind(user.id)
        .execute(&*pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                (StatusCode::NOT_FOUND, Json(json!({"error": "not found"}))).into_response()
            } else {
                (StatusCode::OK, Json(json!({"ok": true}))).into_response()
            }
        }
        Err(e) => {
            tracing::error!("delete_measurement failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}
