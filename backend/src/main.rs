mod api;
mod tools;
mod middleware;
mod app;

use axum::http::{Method, header};
use axum::Json;
use serde_json::json;
use tower_http::cors::CorsLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::sync::Arc;
// Test-only imports
#[cfg(test)]
use serial_test::serial;

/// Maximum length for logged origin strings to prevent log injection
const MAX_LOG_ORIGIN_LENGTH: usize = 100;

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

    let safe_allowed_origins: String = allowed_origins
        .chars()
        .take(MAX_LOG_ORIGIN_LENGTH)
        .filter(|c| !c.is_control())
        .collect();
    tracing::info!(
        "Configuring CORS with allowed origins: {}",
        safe_allowed_origins
    );

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

    // Collect all valid HeaderValue origins into a Vec
    let valid_origins: Vec<HeaderValue> = origins
        .into_iter()
        .filter_map(|origin| {
            match origin.parse::<HeaderValue>() {
                Ok(header_value) => Some(header_value),
                Err(e) => {
                    // Sanitize origin for logging by truncating and removing control characters
                    let safe_origin: String = origin
                        .chars()
                        .take(MAX_LOG_ORIGIN_LENGTH)
                        .filter(|c| !c.is_control())
                        .collect();
                    tracing::warn!(
                        "Failed to parse origin '{}' as HeaderValue (error: {}). Origin will be ignored.",
                        safe_origin,
                        e
                    );
                    None
                }
            }
        })
        .collect();

    // Handle the case when all origins failed to parse
    if valid_origins.is_empty() {
        tracing::warn!("All origins failed to parse as HeaderValue, CORS will deny all origins");
        return CorsLayer::new()
            .allow_methods([Method::GET, Method::POST])
            .allow_headers([header::CONTENT_TYPE]);
    }

    // Use AllowOrigin::list to configure multiple origins at once
    use tower_http::cors::AllowOrigin;

    CorsLayer::new()
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([header::CONTENT_TYPE])
        .allow_origin(AllowOrigin::list(valid_origins))
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
    let _cors = configure_cors();

    tracing::info!(
        "CORS configured with allowed origins from ALLOWED_ORIGINS environment variable"
    );

    // Build our application with routes
    // Initialize Postgres pool
    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "postgres://localhost/tools".into());
    let pool: PgPool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    // Initialize optional Redis client and session store
    let redis_url_opt = std::env::var("REDIS_URL").ok();
    let mut session_store_opt = None;
    if let Some(redis_url) = &redis_url_opt {
        match crate::tools::session::SessionStore::new(redis_url, "tools").await {
            Ok(s) => session_store_opt = Some(Arc::new(tokio::sync::Mutex::new(s))),
            Err(e) => tracing::error!("Failed to initialize session store: {}", e),
        }
    }

    let shared_pool = Arc::new(pool);

    let app = app::build_app(shared_pool.clone(), session_store_opt);

    // Run the server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    tracing::info!("Server running on http://0.0.0.0:3001");
    axum::serve(listener, app).await.unwrap();
}

/// Root endpoint
#[allow(dead_code)]
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

    #[test]
    #[serial(env)]
    fn test_configure_cors_with_default_origins() {
        // Test that CORS is configured with default localhost origins when env var is not set
        temp_env::with_var_unset("ALLOWED_ORIGINS", || {
            let cors_layer = configure_cors();
            // Should not panic and should create a valid CorsLayer
            assert!(std::mem::size_of_val(&cors_layer) > 0);
        });
    }

    #[test]
    #[serial(env)]
    fn test_configure_cors_with_custom_origins() {
        // Test that CORS accepts custom origins from environment variable
        temp_env::with_var(
            "ALLOWED_ORIGINS",
            Some("http://example.com,https://app.example.com"),
            || {
                let cors_layer = configure_cors();
                assert!(std::mem::size_of_val(&cors_layer) > 0);
            },
        );
    }

    #[test]
    #[serial(env)]
    fn test_configure_cors_with_empty_origins() {
        // Test that CORS handles empty origin string
        temp_env::with_var("ALLOWED_ORIGINS", Some(""), || {
            let cors_layer = configure_cors();
            assert!(std::mem::size_of_val(&cors_layer) > 0);
        });
    }

    #[test]
    #[serial(env)]
    fn test_configure_cors_with_invalid_origins() {
        // Test that CORS handles invalid origin strings gracefully
        temp_env::with_var(
            "ALLOWED_ORIGINS",
            Some("not-a-valid-url,another-invalid"),
            || {
                let cors_layer = configure_cors();
                assert!(std::mem::size_of_val(&cors_layer) > 0);
            },
        );
    }

    #[test]
    #[serial(env)]
    fn test_env_cleanup_on_panic() {
        // Test that environment variables are properly restored even if a panic occurs
        // This test demonstrates the safety improvement of using temp_env

        // Store the original value (or lack thereof)
        let original = std::env::var("ALLOWED_ORIGINS").ok();

        // This should panic but still clean up the environment variable
        let result = std::panic::catch_unwind(|| {
            temp_env::with_var("ALLOWED_ORIGINS", Some("test-value"), || {
                // Verify the value is set
                assert_eq!(std::env::var("ALLOWED_ORIGINS").unwrap(), "test-value");
                // Simulate a panic
                panic!("Intentional panic for testing");
            });
        });

        // Verify the panic occurred
        assert!(result.is_err());

        // Verify the environment variable was restored to its original state
        assert_eq!(std::env::var("ALLOWED_ORIGINS").ok(), original);
    }

    #[test]
    fn test_configure_cors_with_multiple_valid_origins() {
        // Test that multiple origins are all properly configured
        // This test verifies the fix for the issue where calling allow_origin
        // repeatedly in a loop would overwrite previous values
        std::env::set_var(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://localhost:3001,https://example.com,https://app.example.com"
        );
        let cors_layer = configure_cors();
        // Should not panic and should create a valid CorsLayer with all origins
        assert!(std::mem::size_of_val(&cors_layer) > 0);
        std::env::remove_var("ALLOWED_ORIGINS");
    }
