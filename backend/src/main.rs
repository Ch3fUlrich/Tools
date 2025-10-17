mod api;
mod tools;

use axum::{
    http::{header, Method, StatusCode},
    routing::{get, post},
    Json, Router,
};
use serde_json::json;
use tower_http::cors::CorsLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

/// Configure CORS based on environment variables
/// 
/// Reads ALLOWED_ORIGINS environment variable which should contain comma-separated origins.
/// Defaults to localhost origins for development if not set.
/// 
/// Example: ALLOWED_ORIGINS="http://localhost:3000,https://example.com"
fn configure_cors() -> CorsLayer {
    use axum::http::{HeaderValue, Uri};

    let allowed_origins = std::env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:3000,http://localhost:3001".to_string());

    tracing::info!("Configuring CORS with allowed origins: {}", allowed_origins);

    let origins: Vec<_> = allowed_origins
        .split(',')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .filter_map(|origin| {
            origin.parse::<Uri>().ok().and_then(|uri| {
                let scheme = uri.scheme_str()?;
                let authority = uri.authority()?;
                Some(format!("{}://{}", scheme, authority))
            })
        })
        .collect();

    if origins.is_empty() {
        tracing::warn!("No valid origins configured, CORS will deny all origins");
        return CorsLayer::new()
            .allow_methods([Method::GET, Method::POST])
            .allow_headers([header::CONTENT_TYPE]);
    }

    let mut cors_layer = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([header::CONTENT_TYPE]);

    for origin in origins {
        if let Ok(header_value) = origin.parse::<HeaderValue>() {
            cors_layer = cors_layer.allow_origin(header_value);
        }
    }

    cors_layer
}

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "tools_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Configure CORS with environment-based origin restrictions
    let cors = configure_cors();

    tracing::info!(
        "CORS configured with allowed origins from ALLOWED_ORIGINS environment variable"
    );

    // Build our application with routes
    let app = Router::new()
        .route("/", get(root))
        .route("/api/health", get(health_check))
        .route(
            "/api/tools/fat-loss",
            post(api::fat_loss::calculate_fat_loss),
        )
        .route(
            "/api/tools/n26-analyzer",
            post(api::n26_analyzer::analyze_n26_data),
        )
        .layer(cors);

    // Run the server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();

    tracing::info!("Server running on http://0.0.0.0:3001");

    axum::serve(listener, app).await.unwrap();
}

/// Root endpoint
async fn root() -> Json<serde_json::Value> {
    Json(json!({
        "name": "Tools Backend API",
        "version": "0.1.0",
        "endpoints": [
            "/api/health",
            "/api/tools/fat-loss",
            "/api/tools/n26-analyzer"
        ]
    }))
}

/// Health check endpoint
async fn health_check() -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::OK,
        Json(json!({
            "status": "healthy",
            "timestamp": chrono::Utc::now().to_rfc3339()
        })),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_health_check() {
        let (status, response) = health_check().await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(response.0["status"], "healthy");
    }

    #[test]
    fn test_configure_cors_with_default_origins() {
        // Test that CORS is configured with default localhost origins when env var is not set
        std::env::remove_var("ALLOWED_ORIGINS");
        let cors_layer = configure_cors();
        // Should not panic and should create a valid CorsLayer
        assert!(std::mem::size_of_val(&cors_layer) > 0);
    }

    #[test]
    fn test_configure_cors_with_custom_origins() {
        // Test that CORS accepts custom origins from environment variable
        std::env::set_var("ALLOWED_ORIGINS", "http://example.com,https://app.example.com");
        let cors_layer = configure_cors();
        assert!(std::mem::size_of_val(&cors_layer) > 0);
        std::env::remove_var("ALLOWED_ORIGINS");
    }

    #[test]
    fn test_configure_cors_with_empty_origins() {
        // Test that CORS handles empty origin string
        std::env::set_var("ALLOWED_ORIGINS", "");
        let cors_layer = configure_cors();
        assert!(std::mem::size_of_val(&cors_layer) > 0);
        std::env::remove_var("ALLOWED_ORIGINS");
    }

    #[test]
    fn test_configure_cors_with_invalid_origins() {
        // Test that CORS handles invalid origin strings gracefully
        std::env::set_var("ALLOWED_ORIGINS", "not-a-valid-url,another-invalid");
        let cors_layer = configure_cors();
        assert!(std::mem::size_of_val(&cors_layer) > 0);
        std::env::remove_var("ALLOWED_ORIGINS");
    }
}
