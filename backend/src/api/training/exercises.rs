use super::*;
use crate::middleware::session_middleware::AuthenticatedUser;
use axum::extract::{Extension, Json, Path, Query};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde_json::json;
use sqlx::{PgPool, Row};
use std::sync::Arc;
use uuid::Uuid;

pub async fn list_exercises(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Query(params): Query<ExerciseFilterParams>,
) -> impl IntoResponse {
    // Build dynamic query with filters
    let mut query = String::from(
        "SELECT e.id, e.name, e.description, e.movement_pattern, e.equipment, e.difficulty,
                e.is_bodyweight, e.is_unilateral, e.primary_segments_moved, e.rom_degrees,
                e.body_mass_fraction_moved, e.is_system_default, e.metadata
         FROM exercises e WHERE (e.is_system_default = TRUE OR e.user_id = $1)",
    );
    let mut param_idx = 2u32;

    if let Some(ref equipment) = params.equipment {
        query.push_str(&format!(" AND e.equipment = ${param_idx}"));
        param_idx += 1;
        let _ = equipment;
    }
    if let Some(ref pattern) = params.pattern {
        query.push_str(&format!(" AND e.movement_pattern = ${param_idx}"));
        param_idx += 1;
        let _ = pattern;
    }
    if let Some(ref difficulty) = params.difficulty {
        query.push_str(&format!(" AND e.difficulty = ${param_idx}"));
        param_idx += 1;
        let _ = difficulty;
    }
    if let Some(ref search) = params.search {
        query.push_str(&format!(" AND lower(e.name) LIKE '%' || lower(${param_idx}) || '%'"));
        let _ = (param_idx, search);
    }

    query.push_str(" ORDER BY e.is_system_default DESC, e.name");

    // Use simpler approach: fetch all and filter in Rust for dynamic params
    // (sqlx doesn't support dynamic bind count easily)
    match sqlx::query(
        "SELECT e.id, e.name, e.description, e.movement_pattern, e.equipment, e.difficulty,
                e.is_bodyweight, e.is_unilateral, e.primary_segments_moved, e.rom_degrees,
                e.body_mass_fraction_moved, e.is_system_default, e.metadata
         FROM exercises e WHERE (e.is_system_default = TRUE OR e.user_id = $1)
         ORDER BY e.is_system_default DESC, e.name",
    )
    .bind(user.id)
    .fetch_all(&*pool)
    .await
    {
        Ok(rows) => {
            let exercises: Vec<serde_json::Value> = rows.iter().filter(|row| {
                // Apply filters in Rust
                let matches_equipment = params.equipment.as_ref().is_none_or(|eq| {
                    row.try_get::<String, _>("equipment").ok().as_deref() == Some(eq.as_str())
                });
                let matches_pattern = params.pattern.as_ref().is_none_or(|p| {
                    row.try_get::<String, _>("movement_pattern").ok().as_deref() == Some(p.as_str())
                });
                let matches_difficulty = params.difficulty.as_ref().is_none_or(|d| {
                    row.try_get::<String, _>("difficulty").ok().as_deref() == Some(d.as_str())
                });
                let matches_search = params.search.as_ref().is_none_or(|s| {
                    row.try_get::<String, _>("name").ok()
                        .is_some_and(|n| n.to_lowercase().contains(&s.to_lowercase()))
                });
                matches_equipment && matches_pattern && matches_difficulty && matches_search
            }).map(|row| {
                json!({
                    "id": row.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
                    "name": row.try_get::<String, _>("name").unwrap_or_default(),
                    "description": row.try_get::<Option<String>, _>("description").ok().flatten(),
                    "movementPattern": row.try_get::<String, _>("movement_pattern").unwrap_or_default(),
                    "equipment": row.try_get::<String, _>("equipment").unwrap_or_default(),
                    "difficulty": row.try_get::<String, _>("difficulty").unwrap_or_default(),
                    "isBodyweight": row.try_get::<bool, _>("is_bodyweight").unwrap_or(false),
                    "isUnilateral": row.try_get::<bool, _>("is_unilateral").unwrap_or(false),
                    "primarySegmentsMoved": row.try_get::<Vec<String>, _>("primary_segments_moved").unwrap_or_default(),
                    "romDegrees": row.try_get::<sqlx::types::BigDecimal, _>("rom_degrees").ok().map(|d| d.to_string()),
                    "bodyMassFractionMoved": row.try_get::<sqlx::types::BigDecimal, _>("body_mass_fraction_moved").ok().map(|d| d.to_string()),
                    "isSystemDefault": row.try_get::<bool, _>("is_system_default").unwrap_or(false),
                    "metadata": row.try_get::<serde_json::Value, _>("metadata").unwrap_or(json!({})),
                })
            }).collect();
            (StatusCode::OK, Json(json!({"exercises": exercises}))).into_response()
        }
        Err(e) => {
            tracing::error!("list_exercises failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

pub async fn get_exercise(
    Extension(pool): Extension<Arc<PgPool>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "invalid id"}))).into_response()
        }
    };

    let exercise = sqlx::query(
        "SELECT id, name, description, movement_pattern, equipment, difficulty, is_bodyweight, is_unilateral,
                primary_segments_moved, rom_degrees, body_mass_fraction_moved, is_system_default, metadata
         FROM exercises WHERE id = $1"
    )
    .bind(uuid)
    .fetch_optional(&*pool)
    .await;

    let muscles = sqlx::query(
        "SELECT mg.name, mg.display_name, em.involvement, em.activation_fraction
         FROM exercise_muscles em JOIN muscle_groups mg ON mg.id = em.muscle_group_id
         WHERE em.exercise_id = $1 ORDER BY em.involvement, mg.name",
    )
    .bind(uuid)
    .fetch_all(&*pool)
    .await;

    match (exercise, muscles) {
        (Ok(Some(row)), Ok(muscle_rows)) => {
            let muscles: Vec<serde_json::Value> = muscle_rows.iter().map(|mr| {
                json!({
                    "name": mr.try_get::<String, _>("name").unwrap_or_default(),
                    "displayName": mr.try_get::<String, _>("display_name").unwrap_or_default(),
                    "involvement": mr.try_get::<String, _>("involvement").unwrap_or_default(),
                    "activationFraction": mr.try_get::<sqlx::types::BigDecimal, _>("activation_fraction").ok().map(|d| d.to_string()),
                })
            }).collect();

            (StatusCode::OK, Json(json!({
                "id": row.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
                "name": row.try_get::<String, _>("name").unwrap_or_default(),
                "description": row.try_get::<Option<String>, _>("description").ok().flatten(),
                "movementPattern": row.try_get::<String, _>("movement_pattern").unwrap_or_default(),
                "equipment": row.try_get::<String, _>("equipment").unwrap_or_default(),
                "difficulty": row.try_get::<String, _>("difficulty").unwrap_or_default(),
                "isBodyweight": row.try_get::<bool, _>("is_bodyweight").unwrap_or(false),
                "isUnilateral": row.try_get::<bool, _>("is_unilateral").unwrap_or(false),
                "primarySegmentsMoved": row.try_get::<Vec<String>, _>("primary_segments_moved").unwrap_or_default(),
                "romDegrees": row.try_get::<sqlx::types::BigDecimal, _>("rom_degrees").ok().map(|d| d.to_string()),
                "bodyMassFractionMoved": row.try_get::<sqlx::types::BigDecimal, _>("body_mass_fraction_moved").ok().map(|d| d.to_string()),
                "isSystemDefault": row.try_get::<bool, _>("is_system_default").unwrap_or(false),
                "metadata": row.try_get::<serde_json::Value, _>("metadata").unwrap_or(json!({})),
                "muscles": muscles,
            }))).into_response()
        }
        (Ok(None), _) => {
            (StatusCode::NOT_FOUND, Json(json!({"error": "exercise not found"}))).into_response()
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("get_exercise failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}
