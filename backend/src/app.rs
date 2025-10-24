use axum::{Router, routing::{get, post}, Json};
use axum::http::StatusCode;
use serde_json::json;
use std::sync::Arc;
use sqlx::PgPool;

async fn root() -> Json<serde_json::Value> {
    Json(json!({
        "name": "Tools Backend API",
        "version": "0.1.0",
        "endpoints": ["/api/health","/api/tools/fat-loss","/api/tools/n26-analyzer"]
    }))
}

async fn health_check() -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::OK,
        Json(json!({"status":"healthy","timestamp": chrono::Utc::now().to_rfc3339()})),
    )
}

pub fn build_app(pool: Arc<PgPool>, session_store: Option<Arc<tokio::sync::Mutex<crate::tools::session::SessionStore>>>) -> Router {
    let shared_pool = pool.clone();
    let app = Router::new()
        .route("/", get(root))
        .route("/healthz", get(health_check))
        .route("/api/health", get(health_check))
        .route(
            "/api/tools/fat-loss",
            post(crate::api::fat_loss::calculate_fat_loss),
        )
        .route(
            "/api/tools/n26-analyzer",
            post(crate::api::n26_analyzer::analyze_n26_data),
        )
        .route(
            "/api/tools/dice/roll",
            post(crate::api::dice::roll),
        )
        .route("/api/tools/dice/save", post(crate::api::dice_history::save))
        .route("/api/tools/dice/history", get(crate::api::dice_history::history))
        .route("/api/auth/register", post(crate::api::auth::register))
        .route("/api/auth/login", post(crate::api::auth::login))
        .route("/api/auth/logout", post(crate::api::auth::logout))
        .route("/api/auth/oidc/start", get(crate::api::oidc::start))
        .route("/api/auth/oidc/callback", get(crate::api::oidc::callback))
        .layer(tower_http::cors::CorsLayer::new())
        .layer(axum::extract::Extension(shared_pool));
    let app = app.layer(axum::extract::Extension(session_store));
    app
}
