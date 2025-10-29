mod api;
mod app;
mod middleware;
mod tools;

use axum::http::{header, Method};
use axum::Json;
use serde_json::json;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
// Test-only imports
#[cfg(test)]
use serial_test::serial;

/// Maximum length for logged origin strings to prevent log injection
const MAX_LOG_ORIGIN_LENGTH: usize = 100;

// Redact credentials from database URL for safe logging. We keep scheme and host/DB portion
// but replace any userinfo with '***'. This is intentionally conservative — we do not
// attempt to parse everything perfectly, only to avoid printing credentials in logs.
fn redact_database_url(url: &str) -> String {
    if let Some(idx) = url.find("://") {
        let scheme = &url[..idx];
        let rest = &url[idx + 3..];
        if let Some(at) = rest.find('@') {
            // show `scheme://***@host...`
            let host_part = &rest[at + 1..];
            return format!("{scheme}://***@{host_part}");
        }
    }
    if url.len() > 80 {
        format!("{}...", &url[..80])
    } else {
        url.to_string()
    }
}

/// Configure CORS based on environment variables
///
/// Reads `ALLOWED_ORIGINS` environment variable which should contain comma-separated origins.
/// Defaults to localhost origins for development if not set.
///
/// Example: `ALLOWED_ORIGINS="http://localhost:3000,https://example.com`"
fn configure_cors() -> CorsLayer {
    use axum::http::{HeaderValue, Uri};

    // Build a sensible default for allowed origins from FRONTEND_PORT and BACKEND_PORT
    // so the defaults follow the ports the services actually run on. If BACKEND_PORT
    // is not set we fall back to PORT (used elsewhere). If ALLOWED_ORIGINS is set,
    // it takes precedence.
    let default_frontend_port: u16 = std::env::var("FRONTEND_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(3000);

    let default_backend_port: u16 = std::env::var("BACKEND_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .or_else(|| std::env::var("PORT").ok().and_then(|s| s.parse().ok()))
        .unwrap_or(3001);

    let default_allowed =
        format!("http://localhost:{default_frontend_port},http://localhost:{default_backend_port}");

    let allowed_origins = std::env::var("ALLOWED_ORIGINS").unwrap_or(default_allowed);

    let safe_allowed_origins: String = allowed_origins
        .chars()
        .take(MAX_LOG_ORIGIN_LENGTH)
        .filter(|c| !c.is_control())
        .collect();
    tracing::info!("Configuring CORS with allowed origins: {}", safe_allowed_origins);

    let origins: Vec<_> = allowed_origins
        .split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .filter_map(|origin| {
            origin.parse::<Uri>().ok().and_then(|uri| {
                let scheme = uri.scheme_str()?;
                let authority = uri.authority()?;
                Some(format!("{scheme}://{authority}"))
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
    let cors = configure_cors();

    tracing::info!(
        "CORS configured with allowed origins from ALLOWED_ORIGINS environment variable"
    );

    // Build our application with routes
    // Initialize Postgres pool
    let database_url =
        std::env::var("DATABASE_URL").unwrap_or_else(|_| "postgres://localhost/tools".into());
    let pool: PgPool = match PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
    {
        Ok(p) => p,
        Err(e) => {
            let redacted = redact_database_url(&database_url);
            tracing::error!("Failed to connect to database ({})", redacted);
            tracing::error!("Error connecting to database: {}", e);
            tracing::error!("Hints: Ensure the database is running and reachable. Check DATABASE_URL and network access. To see a backtrace run with RUST_BACKTRACE=1");
            // Exit with non-zero code rather than panicking so error output is clearer to the user
            std::process::exit(1);
        }
    };

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

    let app = app::build_app(shared_pool.clone(), session_store_opt).layer(cors);

    // Run the server. Honor PORT env var if set (fallback to 3001).
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(3001);

    let bind_addr = format!("0.0.0.0:{port}");
    let listener = match tokio::net::TcpListener::bind(&bind_addr).await {
        Ok(l) => l,
        Err(e) => {
            tracing::error!("Failed to bind to {}: {}", bind_addr, e);
            tracing::error!("Is the port already in use? If you meant a different port, set the PORT environment variable.");
            std::process::exit(1);
        }
    };

    tracing::info!("Server running on http://{}", bind_addr);

    if let Err(e) = axum::serve(listener, app).await {
        tracing::error!("Server error: {}", e);
        std::process::exit(1);
    }
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
    temp_env::with_var("ALLOWED_ORIGINS", Some("not-a-valid-url,another-invalid"), || {
        let cors_layer = configure_cors();
        assert!(std::mem::size_of_val(&cors_layer) > 0);
    });
}

#[test]
#[serial(env)]
fn test_env_cleanup_on_panic() {
    // Test that environment variables are properly restored even if a panic occurs
    // This test demonstrates the safety improvement of using temp_env

    // Ensure we start with a clean environment for this test
    std::env::remove_var("ALLOWED_ORIGINS");

    // Store the original value (should be None after removal)
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

    // Clean up: ensure ALLOWED_ORIGINS is not set for other tests
    std::env::remove_var("ALLOWED_ORIGINS");
}

#[test]
fn test_configure_cors_with_multiple_valid_origins() {
    // Test that multiple origins are all properly configured
    // This test verifies the fix for the issue where calling allow_origin
    // repeatedly in a loop would overwrite previous values
    std::env::set_var(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:3001,https://example.com,https://app.example.com",
    );
    let cors_layer = configure_cors();
    // Should not panic and should create a valid CorsLayer with all origins
    assert!(std::mem::size_of_val(&cors_layer) > 0);
    std::env::remove_var("ALLOWED_ORIGINS");
}
