use crate::middleware::session_middleware::AuthenticatedUser;
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
