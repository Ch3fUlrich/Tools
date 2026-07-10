use super::*;
use crate::middleware::session_middleware::AuthenticatedUser;
use axum::extract::{Extension, Json, Query};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde_json::json;
use sqlx::{PgPool, Row};
use std::sync::Arc;

pub async fn stats_energy(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Query(_params): Query<StatsFilterParams>,
) -> impl IntoResponse {
    match sqlx::query(
        "SELECT ws.started_at::date as day, SUM(wse.energy_kcal) as total_energy
         FROM workout_sessions ws
         JOIN workout_sets wse ON wse.session_id = ws.id
         WHERE ws.user_id = $1 AND ws.status = 'completed'
         GROUP BY ws.started_at::date
         ORDER BY day DESC LIMIT 365",
    )
    .bind(user.id)
    .fetch_all(&*pool)
    .await
    {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows.iter().map(|row| {
                json!({
                    "date": row.try_get::<chrono::NaiveDate, _>("day").ok().map(|d| d.to_string()),
                    "totalEnergyKcal": row.try_get::<Option<sqlx::types::BigDecimal>, _>("total_energy").ok().flatten().map(|d| d.to_string()),
                })
            }).collect();
            (StatusCode::OK, Json(json!({"data": data}))).into_response()
        }
        Err(e) => {
            tracing::error!("stats_energy failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

pub async fn stats_volume(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Query(_params): Query<StatsFilterParams>,
) -> impl IntoResponse {
    match sqlx::query(
        "SELECT ws.started_at::date as day, SUM(wse.weight_kg * wse.reps) as total_volume
         FROM workout_sessions ws
         JOIN workout_sets wse ON wse.session_id = ws.id
         WHERE ws.user_id = $1 AND ws.status = 'completed'
         GROUP BY ws.started_at::date
         ORDER BY day DESC LIMIT 365",
    )
    .bind(user.id)
    .fetch_all(&*pool)
    .await
    {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows.iter().map(|row| {
                json!({
                    "date": row.try_get::<chrono::NaiveDate, _>("day").ok().map(|d| d.to_string()),
                    "totalVolumeKg": row.try_get::<Option<sqlx::types::BigDecimal>, _>("total_volume").ok().flatten().map(|d| d.to_string()),
                })
            }).collect();
            (StatusCode::OK, Json(json!({"data": data}))).into_response()
        }
        Err(e) => {
            tracing::error!("stats_volume failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

pub async fn stats_muscle_energy(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Query(_params): Query<StatsFilterParams>,
) -> impl IntoResponse {
    // Get all completed session sets with their exercise muscle mappings
    match sqlx::query(
        "SELECT mg.name as muscle_name, mg.display_name, mg.relative_size, mg.body_map_position, mg.svg_region_id,
                em.involvement, em.activation_fraction,
                SUM(wse.energy_kcal) as exercise_energy
         FROM workout_sessions ws
         JOIN workout_sets wse ON wse.session_id = ws.id
         JOIN exercise_muscles em ON em.exercise_id = wse.exercise_id
         JOIN muscle_groups mg ON mg.id = em.muscle_group_id
         WHERE ws.user_id = $1 AND ws.status = 'completed'
         GROUP BY mg.name, mg.display_name, mg.relative_size, mg.body_map_position, mg.svg_region_id, em.involvement, em.activation_fraction
         ORDER BY mg.name"
    )
    .bind(user.id)
    .fetch_all(&*pool)
    .await
    {
        Ok(rows) => {
            // Aggregate: for each muscle, sum up attributed energy
            let mut muscle_totals: std::collections::HashMap<String, serde_json::Value> = std::collections::HashMap::new();

            for row in &rows {
                let name = row.try_get::<String, _>("muscle_name").unwrap_or_default();
                let energy: f64 = row.try_get::<Option<sqlx::types::BigDecimal>, _>("exercise_energy")
                    .ok().flatten()
                    .and_then(|d| d.to_string().parse::<f64>().ok())
                    .unwrap_or(0.0);

                let entry = muscle_totals.entry(name.clone()).or_insert_with(|| {
                    json!({
                        "muscleName": name,
                        "displayName": row.try_get::<String, _>("display_name").unwrap_or_default(),
                        "relativeSize": row.try_get::<sqlx::types::BigDecimal, _>("relative_size").ok().map(|d| d.to_string()),
                        "bodyMapPosition": row.try_get::<String, _>("body_map_position").unwrap_or_default(),
                        "svgRegionId": row.try_get::<String, _>("svg_region_id").unwrap_or_default(),
                        "energyKcal": 0.0,
                    })
                });

                if let Some(current) = entry.get("energyKcal").and_then(|v| v.as_f64()) {
                    entry["energyKcal"] = json!(current + energy);
                }
            }

            let data: Vec<serde_json::Value> = muscle_totals.into_values().collect();
            (StatusCode::OK, Json(json!({"muscles": data}))).into_response()
        }
        Err(e) => {
            tracing::error!("stats_muscle_energy failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}
