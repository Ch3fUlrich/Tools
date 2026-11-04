use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct StatsFilterParams {
    pub from: Option<String>,
    pub to: Option<String>,
    #[allow(dead_code)]
    pub plan_id: Option<String>,
    #[allow(dead_code)]
    pub exercise_id: Option<String>,
}

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct ExerciseFilterParams {
    pub equipment: Option<String>,
    pub muscle: Option<String>,
    pub pattern: Option<String>,
    pub difficulty: Option<String>,
    pub search: Option<String>,
}

#[allow(clippy::result_large_err)]
pub fn parse_uuid(id: &str) -> Result<Uuid, Response> {
    Uuid::parse_str(id).map_err(|_| {
        (StatusCode::BAD_REQUEST, Json(json!({"error": "invalid id"}))).into_response()
    })
}
