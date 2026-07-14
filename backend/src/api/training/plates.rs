use crate::tools::training::{self};
use axum::extract::Json;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlateCalcRequest {
    pub target_weight_kg: f64,
}

pub async fn calculate_plates(Json(req): Json<PlateCalcRequest>) -> impl IntoResponse {
    let result = training::calculate_plates(req.target_weight_kg);
    (StatusCode::OK, Json(result))
}
