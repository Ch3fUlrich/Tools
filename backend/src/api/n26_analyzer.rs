use crate::tools::n26_analyzer::{analyze_transactions, parse_n26_json, N26Data};
use axum::{
    extract::Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};

/// Handler for N26 data analysis endpoint
pub async fn analyze_n26_data(Json(n26_data): Json<N26Data>) -> Response {
    match parse_n26_json(n26_data) {
        Ok(transactions) => {
            let analysis = analyze_transactions(transactions);
            (StatusCode::OK, Json(analysis)).into_response()
        }
        Err(e) => {
            let error_response = serde_json::json!({
                "error": e
            });
            (StatusCode::BAD_REQUEST, Json(error_response)).into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[tokio::test]
    async fn test_analyze_empty_n26_data() {
        let data = N26Data {
            id: "test".to_string(),
            created: "2024-01-01".to_string(),
            data: HashMap::new(),
        };

        let _response = analyze_n26_data(Json(data)).await;
        // Response should be OK with empty data
    }
}
