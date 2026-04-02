use crate::middleware::session_middleware::AuthenticatedUser;
use crate::tools::training::{self, BodyMeasurements, SetEnergy, SetEnergyParams, Tempo};
use axum::extract::{Extension, Json, Path, Query};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};
use std::sync::Arc;
use uuid::Uuid;

// ============================================================================
// SHARED TYPES
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct StatsFilterParams {
    pub from: Option<String>,
    pub to: Option<String>,
    pub plan_id: Option<String>,
    pub exercise_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ExerciseFilterParams {
    pub equipment: Option<String>,
    pub muscle: Option<String>,
    pub pattern: Option<String>,
    pub difficulty: Option<String>,
    pub search: Option<String>,
}

// ============================================================================
// BODY MEASUREMENTS
// ============================================================================

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

// ============================================================================
// MUSCLE GROUPS
// ============================================================================

pub async fn list_muscles(Extension(pool): Extension<Arc<PgPool>>) -> impl IntoResponse {
    match sqlx::query("SELECT id, name, display_name, relative_size, body_map_position, svg_region_id FROM muscle_groups ORDER BY name")
        .fetch_all(&*pool)
        .await
    {
        Ok(rows) => {
            let muscles: Vec<serde_json::Value> = rows.iter().map(|row| {
                json!({
                    "id": row.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
                    "name": row.try_get::<String, _>("name").unwrap_or_default(),
                    "displayName": row.try_get::<String, _>("display_name").unwrap_or_default(),
                    "relativeSize": row.try_get::<sqlx::types::BigDecimal, _>("relative_size").ok().map(|d| d.to_string()),
                    "bodyMapPosition": row.try_get::<String, _>("body_map_position").unwrap_or_default(),
                    "svgRegionId": row.try_get::<String, _>("svg_region_id").unwrap_or_default(),
                })
            }).collect();
            (StatusCode::OK, Json(json!({"muscles": muscles}))).into_response()
        }
        Err(e) => {
            tracing::error!("list_muscles failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

// ============================================================================
// EXERCISES
// ============================================================================

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
                let matches_equipment = params.equipment.as_ref().map_or(true, |eq| {
                    row.try_get::<String, _>("equipment").ok().as_deref() == Some(eq.as_str())
                });
                let matches_pattern = params.pattern.as_ref().map_or(true, |p| {
                    row.try_get::<String, _>("movement_pattern").ok().as_deref() == Some(p.as_str())
                });
                let matches_difficulty = params.difficulty.as_ref().map_or(true, |d| {
                    row.try_get::<String, _>("difficulty").ok().as_deref() == Some(d.as_str())
                });
                let matches_search = params.search.as_ref().map_or(true, |s| {
                    row.try_get::<String, _>("name").ok()
                        .map_or(false, |n| n.to_lowercase().contains(&s.to_lowercase()))
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

// ============================================================================
// TRAINING PLANS
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePlanRequest {
    pub name: String,
    pub description: Option<String>,
    pub plan_type: Option<String>,
}

pub async fn list_plans(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
) -> impl IntoResponse {
    match sqlx::query(
        "SELECT id, name, description, plan_type, is_active, sort_order, created_at
         FROM training_plans WHERE user_id = $1 ORDER BY sort_order, name",
    )
    .bind(user.id)
    .fetch_all(&*pool)
    .await
    {
        Ok(rows) => {
            let plans: Vec<serde_json::Value> = rows.iter().map(|row| {
                json!({
                    "id": row.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
                    "name": row.try_get::<String, _>("name").unwrap_or_default(),
                    "description": row.try_get::<Option<String>, _>("description").ok().flatten(),
                    "planType": row.try_get::<String, _>("plan_type").unwrap_or_default(),
                    "isActive": row.try_get::<bool, _>("is_active").unwrap_or(true),
                    "sortOrder": row.try_get::<i32, _>("sort_order").unwrap_or(0),
                })
            }).collect();
            (StatusCode::OK, Json(json!({"plans": plans}))).into_response()
        }
        Err(e) => {
            tracing::error!("list_plans failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

pub async fn create_plan(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Json(req): Json<CreatePlanRequest>,
) -> impl IntoResponse {
    let plan_type = req.plan_type.unwrap_or_else(|| "custom".to_string());
    match sqlx::query(
        "INSERT INTO training_plans (user_id, name, description, plan_type) VALUES ($1, $2, $3, $4) RETURNING id"
    )
    .bind(user.id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&plan_type)
    .fetch_one(&*pool)
    .await
    {
        Ok(row) => {
            let id: Uuid = row.try_get("id").unwrap_or_default();
            (StatusCode::CREATED, Json(json!({"id": id.to_string()}))).into_response()
        }
        Err(e) => {
            tracing::error!("create_plan failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

pub async fn get_plan(
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

    let plan = sqlx::query(
        "SELECT id, name, description, plan_type, is_active FROM training_plans WHERE id = $1 AND user_id = $2"
    )
    .bind(uuid)
    .bind(user.id)
    .fetch_optional(&*pool)
    .await;

    let exercises = sqlx::query(
        "SELECT tpe.id, tpe.exercise_id, e.name as exercise_name, tpe.sort_order, tpe.target_sets,
                tpe.target_reps, tpe.target_weight_kg, tpe.target_rpe, tpe.rest_seconds, tpe.superset_group, tpe.notes
         FROM training_plan_exercises tpe
         JOIN exercises e ON e.id = tpe.exercise_id
         WHERE tpe.plan_id = $1 ORDER BY tpe.sort_order"
    )
    .bind(uuid)
    .fetch_all(&*pool)
    .await;

    match (plan, exercises) {
        (Ok(Some(row)), Ok(ex_rows)) => {
            let exercises: Vec<serde_json::Value> = ex_rows.iter().map(|er| {
                json!({
                    "id": er.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
                    "exerciseId": er.try_get::<Uuid, _>("exercise_id").unwrap_or_default().to_string(),
                    "exerciseName": er.try_get::<String, _>("exercise_name").unwrap_or_default(),
                    "sortOrder": er.try_get::<i32, _>("sort_order").unwrap_or(0),
                    "targetSets": er.try_get::<i32, _>("target_sets").unwrap_or(3),
                    "targetReps": er.try_get::<i32, _>("target_reps").unwrap_or(10),
                    "targetWeightKg": er.try_get::<Option<sqlx::types::BigDecimal>, _>("target_weight_kg").ok().flatten().map(|d| d.to_string()),
                    "targetRpe": er.try_get::<Option<sqlx::types::BigDecimal>, _>("target_rpe").ok().flatten().map(|d| d.to_string()),
                    "restSeconds": er.try_get::<Option<i32>, _>("rest_seconds").ok().flatten(),
                    "supersetGroup": er.try_get::<Option<i32>, _>("superset_group").ok().flatten(),
                    "notes": er.try_get::<Option<String>, _>("notes").ok().flatten(),
                })
            }).collect();

            (
                StatusCode::OK,
                Json(json!({
                    "id": row.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
                    "name": row.try_get::<String, _>("name").unwrap_or_default(),
                    "description": row.try_get::<Option<String>, _>("description").ok().flatten(),
                    "planType": row.try_get::<String, _>("plan_type").unwrap_or_default(),
                    "isActive": row.try_get::<bool, _>("is_active").unwrap_or(true),
                    "exercises": exercises,
                })),
            )
                .into_response()
        }
        (Ok(None), _) => {
            (StatusCode::NOT_FOUND, Json(json!({"error": "plan not found"}))).into_response()
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("get_plan failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

pub async fn update_plan(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Path(id): Path<String>,
    Json(req): Json<CreatePlanRequest>,
) -> impl IntoResponse {
    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "invalid id"}))).into_response()
        }
    };
    match sqlx::query(
        "UPDATE training_plans SET name = $1, description = $2, plan_type = COALESCE($3, plan_type), updated_at = now()
         WHERE id = $4 AND user_id = $5"
    )
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.plan_type)
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
            tracing::error!("update_plan failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

pub async fn delete_plan(
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
    match sqlx::query("DELETE FROM training_plans WHERE id = $1 AND user_id = $2")
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
            tracing::error!("delete_plan failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddPlanExerciseRequest {
    pub exercise_id: String,
    pub sort_order: Option<i32>,
    pub target_sets: Option<i32>,
    pub target_reps: Option<i32>,
    pub target_weight_kg: Option<f64>,
    pub target_rpe: Option<f64>,
    pub rest_seconds: Option<i32>,
    pub superset_group: Option<i32>,
    pub notes: Option<String>,
}

pub async fn add_plan_exercise(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Path(plan_id): Path<String>,
    Json(req): Json<AddPlanExerciseRequest>,
) -> impl IntoResponse {
    let plan_uuid = match Uuid::parse_str(&plan_id) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "invalid plan_id"})))
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

    // Verify plan belongs to user
    let owns = sqlx::query("SELECT 1 FROM training_plans WHERE id = $1 AND user_id = $2")
        .bind(plan_uuid)
        .bind(user.id)
        .fetch_optional(&*pool)
        .await;
    if matches!(owns, Ok(None)) {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "plan not found"}))).into_response();
    }

    match sqlx::query(
        "INSERT INTO training_plan_exercises (plan_id, exercise_id, sort_order, target_sets, target_reps, target_weight_kg, target_rpe, rest_seconds, superset_group, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id"
    )
    .bind(plan_uuid)
    .bind(exercise_uuid)
    .bind(req.sort_order.unwrap_or(0))
    .bind(req.target_sets.unwrap_or(3))
    .bind(req.target_reps.unwrap_or(10))
    .bind(req.target_weight_kg)
    .bind(req.target_rpe)
    .bind(req.rest_seconds)
    .bind(req.superset_group)
    .bind(&req.notes)
    .fetch_one(&*pool)
    .await
    {
        Ok(row) => {
            let id: Uuid = row.try_get("id").unwrap_or_default();
            (StatusCode::CREATED, Json(json!({"id": id.to_string()}))).into_response()
        }
        Err(e) => {
            tracing::error!("add_plan_exercise failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

pub async fn delete_plan_exercise(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Path((plan_id, exercise_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let plan_uuid = match Uuid::parse_str(&plan_id) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "invalid plan_id"})))
                .into_response()
        }
    };
    let pe_uuid = match Uuid::parse_str(&exercise_id) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "invalid id"}))).into_response()
        }
    };

    // Verify ownership
    let owns = sqlx::query("SELECT 1 FROM training_plans WHERE id = $1 AND user_id = $2")
        .bind(plan_uuid)
        .bind(user.id)
        .fetch_optional(&*pool)
        .await;
    if matches!(owns, Ok(None)) {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "plan not found"}))).into_response();
    }

    match sqlx::query("DELETE FROM training_plan_exercises WHERE id = $1 AND plan_id = $2")
        .bind(pe_uuid)
        .bind(plan_uuid)
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
            tracing::error!("delete_plan_exercise failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
        }
    }
}

// ============================================================================
// WORKOUT SESSIONS
// ============================================================================

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
                let matches_from = params.from.as_ref().map_or(true, |f| {
                    chrono::DateTime::parse_from_rfc3339(f).ok()
                        .map_or(true, |from| started.map_or(false, |s| s >= from))
                });
                let matches_to = params.to.as_ref().map_or(true, |t| {
                    chrono::DateTime::parse_from_rfc3339(t).ok()
                        .map_or(true, |to| started.map_or(false, |s| s <= to))
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

// ============================================================================
// WORKOUT SETS
// ============================================================================

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

// ============================================================================
// ENERGY CALCULATION (one-off endpoint)
// ============================================================================

pub async fn calculate_energy(Json(params): Json<SetEnergyParams>) -> impl IntoResponse {
    let energy = training::compute_set_energy(&params);
    (
        StatusCode::OK,
        Json(json!({
            "totalKcal": energy.total_kcal,
            "potentialKcal": energy.potential_kcal,
            "kineticKcal": energy.kinetic_kcal,
            "isometricKcal": energy.isometric_kcal,
            "mechanicalWorkJoules": energy.mechanical_work_joules,
        })),
    )
}

// ============================================================================
// PLATE CALCULATOR
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlateCalcRequest {
    pub target_weight_kg: f64,
}

pub async fn calculate_plates(Json(req): Json<PlateCalcRequest>) -> impl IntoResponse {
    let result = training::calculate_plates(req.target_weight_kg);
    (StatusCode::OK, Json(result))
}

// ============================================================================
// STATS ENDPOINTS
// ============================================================================

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
