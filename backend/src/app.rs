use axum::extract::DefaultBodyLimit;
use axum::http::StatusCode;
use axum::{
    routing::{delete, get, post, put},
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
        .route("/api/auth/me", get(crate::api::auth::get_profile))
        .route("/api/auth/profile", put(crate::api::auth::update_profile))
        .route("/api/auth/oidc/start", get(crate::api::oidc::start))
        .route("/api/auth/oidc/callback", get(crate::api::oidc::callback))
        // --- Training Tracker ---
        // Body measurements
        .route("/api/tools/training/measurements", post(crate::api::training::create_measurement).get(crate::api::training::list_measurements))
        .route("/api/tools/training/measurements/latest", get(crate::api::training::latest_measurement))
        .route("/api/tools/training/measurements/{id}", delete(crate::api::training::delete_measurement))
        // Muscle groups
        .route("/api/tools/training/muscles", get(crate::api::training::list_muscles))
        // Exercises
        .route("/api/tools/training/exercises", get(crate::api::training::list_exercises))
        .route("/api/tools/training/exercises/{id}", get(crate::api::training::get_exercise))
        // Training plans
        .route("/api/tools/training/plans", get(crate::api::training::list_plans).post(crate::api::training::create_plan))
        .route("/api/tools/training/plans/{id}", get(crate::api::training::get_plan).put(crate::api::training::update_plan).delete(crate::api::training::delete_plan))
        .route("/api/tools/training/plans/{plan_id}/exercises", post(crate::api::training::add_plan_exercise))
        .route("/api/tools/training/plans/{plan_id}/exercises/{id}", delete(crate::api::training::delete_plan_exercise))
        // Workout sessions
        .route("/api/tools/training/sessions", post(crate::api::training::start_session).get(crate::api::training::list_sessions))
        .route("/api/tools/training/sessions/{id}", get(crate::api::training::get_session).put(crate::api::training::update_session))
        .route("/api/tools/training/sessions/{session_id}/sets", post(crate::api::training::log_set))
        .route("/api/tools/training/sessions/{session_id}/sets/{id}", delete(crate::api::training::delete_set))
        // Stats
        .route("/api/tools/training/stats/energy", get(crate::api::training::stats_energy))
        .route("/api/tools/training/stats/volume", get(crate::api::training::stats_volume))
        .route("/api/tools/training/stats/muscle-energy", get(crate::api::training::stats_muscle_energy))
        // Utilities
        .route("/api/tools/training/calculate-energy", post(crate::api::training::calculate_energy))
        .route("/api/tools/training/calculate-plates", post(crate::api::training::calculate_plates))
        // Limit request body to 1 MB to prevent abuse
        .layer(DefaultBodyLimit::max(1024 * 1024))
        .layer(tower_http::cors::CorsLayer::new())
        .layer(axum::extract::Extension(shared_pool));

    app.layer(axum::extract::Extension(session_store))
}
