use crate::tools::tolerance::{calculate_blood_levels, ToleranceRequest};
use axum::{extract::Json, http::StatusCode, response::IntoResponse};

/// Handler for tolerance calculation endpoint
pub async fn calculate_tolerance(Json(request): Json<ToleranceRequest>) -> impl IntoResponse {
    match calculate_blood_levels(request) {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(error) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": error}))
        ).into_response(),
    }
}

/// Handler to get available substances
pub async fn get_substances() -> impl IntoResponse {
    let substances = crate::tools::tolerance::get_substances();
    (StatusCode::OK, Json(substances))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[tokio::test]
    async fn test_calculate_tolerance_valid() {
        let request = ToleranceRequest {
            intakes: vec![],
            time_points: vec![Utc::now()],
        };

        let response = calculate_tolerance(Json(request)).await;
        // Should return OK even with empty intakes
        assert_eq!(response.0, StatusCode::OK);
    }

    #[tokio::test]
    async fn test_get_substances() {
        let response = get_substances().await;
        assert_eq!(response.0, StatusCode::OK);
    }
}