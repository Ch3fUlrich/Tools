use axum::http::StatusCode;
use axum::{
    routing::{get, post},
    Json, Router,
};
use serde_json::json;
use sqlx::PgPool;
use std::sync::Arc;

async fn root() -> Json<serde_json::Value> {
    Json(json!({
        "name": "Tools Backend API",
        "version": "0.1.0",
        "endpoints": ["/api/health","/api/tools/fat-loss","/api/tools/n26-analyzer","/api/tools/bloodlevel/calculate","/api/tools/bloodlevel/substances"]
    }))
}

async fn health_check() -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::OK, Json(json!({"status":"healthy","timestamp": chrono::Utc::now().to_rfc3339()})))
}

pub fn build_app(
    pool: Arc<PgPool>,
    session_store: Option<Arc<tokio::sync::Mutex<crate::tools::session::SessionStore>>>,
) -> Router {
    let shared_pool = pool;
    let app = Router::new()
        .route("/", get(root))
        .route("/healthz", get(health_check))
        .route("/api/health", get(health_check))
        .route("/api/tools/fat-loss", post(crate::api::fat_loss::calculate_fat_loss))
        .route("/api/tools/bloodlevel/calculate", post(crate::api::bloodlevel::calculate_tolerance))
        .route("/api/tools/bloodlevel/substances", get(crate::api::bloodlevel::get_substances))
        .route("/api/tools/dice/roll", post(crate::api::dice::roll))
        .route("/api/tools/dice/save", post(crate::api::dice_history::save))
        .route("/api/tools/dice/history", get(crate::api::dice_history::history))
        .route("/api/auth/register", post(crate::api::auth::register))
        .route("/api/auth/login", post(crate::api::auth::login))
        .route("/api/auth/logout", post(crate::api::auth::logout))
        .route("/api/auth/oidc/start", get(crate::api::oidc::start))
        .route("/api/auth/oidc/callback", get(crate::api::oidc::callback))
        .layer(tower_http::cors::CorsLayer::new())
        .layer(axum::extract::Extension(shared_pool));

    app.layer(axum::extract::Extension(session_store))
}
