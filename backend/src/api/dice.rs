use crate::tools::session::SessionStore;
use axum::debug_handler;
use axum::extract::Extension;
use axum::extract::Json;
use axum::response::IntoResponse;
use lazy_static::lazy_static;
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use std::sync::Arc;
use std::sync::Mutex;
use tokio::sync::Mutex as AsyncMutex;

use crate::tools::dice as dice_logic;

lazy_static! {
    static ref RATE_LIMIT: Mutex<HashMap<String, (u32, std::time::Instant)>> =
        Mutex::new(HashMap::new());
}

#[debug_handler]
pub async fn roll(
    Extension(store): Extension<Option<Arc<AsyncMutex<SessionStore>>>>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<JsonValue>,
) -> impl IntoResponse {
    // Attempt to deserialize into DiceRequest
    let req: dice_logic::DiceRequest = match serde_json::from_value(payload) {
        Ok(r) => r,
        Err(e) => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                axum::Json(serde_json::json!({"error": format!("invalid request: {}", e)})),
            )
                .into_response()
        }
    };
    // Prefer Redis-backed limiter if available (per-session id). Fallback to in-memory limiter keyed by "unknown".
    let mut limited = false;
    if let Some(store_arc) = store {
        // try to parse sid from cookie
        let cookie_header = headers
            .get(axum::http::header::COOKIE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        if let Some(sid) = SessionStore::parse_sid_from_cookie(cookie_header) {
            let mut guard = store_arc.lock().await;
            let key = format!("{}:lim:roll:{}", guard.namespace, sid);
            match guard.allow_sliding_window(&key, 60, 20).await {
                Ok(true) => {}
                Ok(false) => {
                    return (
                        axum::http::StatusCode::TOO_MANY_REQUESTS,
                        axum::Json(serde_json::json!({"error":"rate limit exceeded"})),
                    )
                        .into_response()
                }
                Err(_) => {
                    // fallthrough to global limiter
                }
            }
            limited = true;
        } else {
            // global per-app limiter in redis
            let mut guard = store_arc.lock().await;
            let key = format!("{}:lim:global:rolls", guard.namespace);
            if let Ok(ok) = guard.allow_sliding_window(&key, 60, 500).await {
                if !ok {
                    return (
                        axum::http::StatusCode::TOO_MANY_REQUESTS,
                        axum::Json(serde_json::json!({"error":"rate limit exceeded"})),
                    )
                        .into_response();
                }
            }
            limited = true;
        }
    }
    if !limited {
        // fallback in-memory limiter
        let ip = "unknown".to_string();
        {
            let mut map = RATE_LIMIT.lock().unwrap();
            let entry = map
                .entry(ip)
                .or_insert((0, std::time::Instant::now()));
            let elapsed = entry.1.elapsed();
            if elapsed.as_secs() > 60 {
                *entry = (0, std::time::Instant::now());
            }
            if entry.0 > 20 {
                return (
                    axum::http::StatusCode::TOO_MANY_REQUESTS,
                    axum::Json(serde_json::json!({"error":"rate limit exceeded"})),
                )
                    .into_response();
            }
            entry.0 += 1;
        }
    }

    match dice_logic::handle_roll(req).await {
        Ok(resp) => (axum::http::StatusCode::OK, axum::Json(resp)).into_response(),
        Err(e) => (axum::http::StatusCode::BAD_REQUEST, axum::Json(e)).into_response(),
    }
}
