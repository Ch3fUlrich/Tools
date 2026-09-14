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
    let mut query = sqlx::QueryBuilder::<'_, sqlx::Postgres>::new(
        "SELECT e.id, e.name, e.description, e.movement_pattern, e.equipment, e.difficulty,
                e.is_bodyweight, e.is_unilateral, e.primary_segments_moved, e.rom_degrees,
                e.body_mass_fraction_moved, e.is_system_default, e.metadata
         FROM exercises e WHERE (e.is_system_default = TRUE OR e.user_id = ",
    );
    query.push_bind(user.id);
    query.push(")");

    if let Some(ref equipment) = params.equipment {
        query.push(" AND e.equipment = ");
        query.push_bind(equipment);
    }
    if let Some(ref pattern) = params.pattern {
        query.push(" AND e.movement_pattern = ");
        query.push_bind(pattern);
    }
    if let Some(ref difficulty) = params.difficulty {
        query.push(" AND e.difficulty = ");
        query.push_bind(difficulty);
    }
    if let Some(ref search) = params.search {
        query.push(" AND lower(e.name) LIKE '%' || lower(");
        query.push_bind(search);
        query.push(") || '%'");
    }

    query.push(" ORDER BY e.is_system_default DESC, e.name");

    match query.build().fetch_all(&*pool).await {
        Ok(rows) => {
            let exercises: Vec<serde_json::Value> = rows.iter().map(|row| {
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
