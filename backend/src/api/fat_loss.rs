use crate::tools::fat_loss::{calculate_fat_loss_percentage, FatLossRequest};
use axum::{extract::Json, http::StatusCode, response::IntoResponse};

/// Handler for fat loss calculation endpoint
pub async fn calculate_fat_loss(Json(request): Json<FatLossRequest>) -> impl IntoResponse {
    let response = calculate_fat_loss_percentage(request.kcal_deficit, request.weight_loss_kg);

    if response.is_valid {
        (StatusCode::OK, Json(response))
    } else {
        (StatusCode::BAD_REQUEST, Json(response))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_calculate_fat_loss_valid() {
        let request = FatLossRequest { kcal_deficit: 3500.0, weight_loss_kg: 0.5 };

        let _response = calculate_fat_loss(Json(request)).await;
        // Response should be OK
    }
}
