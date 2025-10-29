use crate::tools::bloodlevel::{calculate_blood_levels, ToleranceRequest};
use axum::{extract::Json, http::StatusCode, response::IntoResponse};

/// Handler for blood level calculation endpoint
pub async fn calculate_tolerance(Json(request): Json<ToleranceRequest>) -> impl IntoResponse {
    match calculate_blood_levels(request) {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(error) => {
            (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": error}))).into_response()
        }
    }
}

/// Handler to get available substances
pub async fn get_substances() -> impl IntoResponse {
    let substances = crate::tools::bloodlevel::get_substances();
    (StatusCode::OK, Json(substances))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[tokio::test]
    async fn test_calculate_tolerance_valid() {
        let request = ToleranceRequest { intakes: vec![], time_points: vec![Utc::now()] };

        let resp = calculate_tolerance(Json(request)).await;
        let response = resp.into_response();
        // Should return OK even with empty intakes
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_get_substances() {
        let response = get_substances().await;
        let response = response.into_response();
        assert_eq!(response.status(), StatusCode::OK);
    }
}
