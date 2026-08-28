//! Saved-scenario endpoints for the Elterngeld optimizer.
//!
//! Every handler takes `AuthenticatedUser` and every statement filters on `user_id`, so a
//! request can only ever reach the caller's own rows — there is no endpoint that takes a
//! user id from the client.

use crate::middleware::session_middleware::AuthenticatedUser;
use crate::tools::elterngeld::{check_quota, validate_scenario};
use axum::extract::{Extension, Json, Path};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct SaveScenarioRequest {
    pub name: String,
    pub payload: serde_json::Value,
}

fn internal() -> axum::response::Response {
    (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "internal"}))).into_response()
}

/// Every scenario belonging to the signed-in user, newest edit first.
pub async fn list_scenarios(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
) -> impl IntoResponse {
    match sqlx::query(
        "SELECT id, name, payload, created_at, updated_at FROM elterngeld_inputs \
         WHERE user_id = $1 ORDER BY updated_at DESC",
    )
    .bind(user.id)
    .fetch_all(&*pool)
    .await
    {
        Ok(rows) => {
            let scenarios: Vec<serde_json::Value> = rows
                .iter()
                .map(|row| {
                    json!({
                        "id": row.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
                        "name": row.try_get::<String, _>("name").unwrap_or_default(),
                        "payload": row
                            .try_get::<serde_json::Value, _>("payload")
                            .unwrap_or_else(|_| json!({})),
                        "createdAt": row
                            .try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                            .map(|t| t.to_rfc3339())
                            .unwrap_or_default(),
                        "updatedAt": row
                            .try_get::<chrono::DateTime<chrono::Utc>, _>("updated_at")
                            .map(|t| t.to_rfc3339())
                            .unwrap_or_default(),
                    })
                })
                .collect();
            (StatusCode::OK, Json(json!({ "scenarios": scenarios }))).into_response()
        }
        Err(e) => {
            tracing::error!("list_scenarios failed: {e}");
            internal()
        }
    }
}

/// Create a scenario, or overwrite the one already saved under that name.
///
/// Saving under an existing name is an update rather than an error: from the user's side
/// "save" on a form they have just edited means "keep this version", not "make a second copy
/// with the same label". The unique index on `(user_id, lower(name))` makes the upsert atomic.
pub async fn save_scenario(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Json(req): Json<SaveScenarioRequest>,
) -> impl IntoResponse {
    let name = match validate_scenario(&req.name, &req.payload) {
        Ok(name) => name,
        Err(e) => {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": e.message()}))).into_response()
        }
    };

    // Quota is checked against an insert only; overwriting a name the user already owns must
    // stay possible even at the limit, otherwise they cannot edit their way back under it.
    let existing = sqlx::query(
        "SELECT id FROM elterngeld_inputs WHERE user_id = $1 AND lower(name) = lower($2)",
    )
    .bind(user.id)
    .bind(&name)
    .fetch_optional(&*pool)
    .await;

    let is_update = match existing {
        Ok(row) => row.is_some(),
        Err(e) => {
            tracing::error!("save_scenario lookup failed: {e}");
            return internal();
        }
    };

    if !is_update {
        let count = sqlx::query_scalar::<_, i64>(
            "SELECT count(*) FROM elterngeld_inputs WHERE user_id = $1",
        )
        .bind(user.id)
        .fetch_one(&*pool)
        .await;
        match count {
            Ok(n) => {
                if let Err(e) = check_quota(n, false) {
                    return (StatusCode::CONFLICT, Json(json!({"error": e.message()})))
                        .into_response();
                }
            }
            Err(e) => {
                tracing::error!("save_scenario count failed: {e}");
                return internal();
            }
        }
    }

    match sqlx::query(
        "INSERT INTO elterngeld_inputs (user_id, name, payload) VALUES ($1, $2, $3) \
         ON CONFLICT (user_id, lower(name)) \
         DO UPDATE SET payload = EXCLUDED.payload, name = EXCLUDED.name, updated_at = now() \
         RETURNING id, updated_at",
    )
    .bind(user.id)
    .bind(&name)
    .bind(&req.payload)
    .fetch_one(&*pool)
    .await
    {
        Ok(row) => {
            let status = if is_update { StatusCode::OK } else { StatusCode::CREATED };
            (
                status,
                Json(json!({
                    "id": row.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
                    "name": name,
                    "updatedAt": row
                        .try_get::<chrono::DateTime<chrono::Utc>, _>("updated_at")
                        .map(|t| t.to_rfc3339())
                        .unwrap_or_default(),
                })),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!("save_scenario upsert failed: {e}");
            internal()
        }
    }
}

/// Delete one of the caller's scenarios.
///
/// The `user_id` predicate is what makes this safe: a guessed id belonging to someone else
/// deletes nothing and is reported as 404, which is also all the caller is entitled to know.
pub async fn delete_scenario(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match sqlx::query("DELETE FROM elterngeld_inputs WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user.id)
        .execute(&*pool)
        .await
    {
        Ok(res) if res.rows_affected() > 0 => {
            (StatusCode::OK, Json(json!({"deleted": true}))).into_response()
        }
        Ok(_) => (StatusCode::NOT_FOUND, Json(json!({"error": "not found"}))).into_response(),
        Err(e) => {
            tracing::error!("delete_scenario failed: {e}");
            internal()
        }
    }
}
