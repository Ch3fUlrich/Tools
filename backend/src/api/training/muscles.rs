use axum::extract::{Extension, Json};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde_json::json;
use sqlx::{PgPool, Row};
use std::sync::Arc;
use uuid::Uuid;

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
