use crate::tools::training::{self, SetEnergyParams};
use axum::extract::Json;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde_json::json;

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
