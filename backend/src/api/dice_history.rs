use axum::extract::{Json, Extension};
use axum::response::IntoResponse;
use axum::http::{StatusCode, HeaderMap};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::PgPool;
use sqlx::Row;
use crate::middleware::session_middleware::AuthenticatedUser;
use crate::tools::session::SessionStore;
use std::sync::Arc;
use tokio::sync::Mutex;
use redis::AsyncCommands;
use chrono::Utc;

#[derive(Deserialize)]
pub struct SaveRequest {
    pub payload: JsonValue,
}

#[derive(Serialize)]
pub struct HistoryEntry {
    pub id: Option<String>,
    pub payload: JsonValue,
    pub created_at: String,
}

// POST /api/tools/dice/save
pub async fn save(
    // Try to extract authenticated user; if missing, we'll fall back to session-store
    auth: Result<AuthenticatedUser, (StatusCode, String)>,
    Extension(pool): Extension<Arc<PgPool>>,
    Extension(store): Extension<Option<Arc<Mutex<SessionStore>>>>,
    headers: HeaderMap,
    Json(req): Json<SaveRequest>,
) -> impl IntoResponse {
    // If authenticated, persist to Postgres. Else try Redis-backed session store (sid cookie). Fallback to DB anonymous.
    match auth {
        Ok(AuthenticatedUser(user)) => {
            let payload = req.payload;
            let row = sqlx::query("INSERT INTO dice_rolls (user_id, payload) VALUES ($1, $2) RETURNING id::text")
                .bind(user.id)
                .bind(payload)
                .fetch_one(&*pool)
                .await;
            match row {
                Ok(rec) => {
                    let id: String = rec.try_get("id").unwrap_or_else(|_| "".to_string());
                    (StatusCode::CREATED, axum::Json(serde_json::json!({"id": id}))).into_response()
                }
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error": format!("DB error: {}", e)}))).into_response(),
            }
        }
        Err(_) => {
            // attempt to use redis session store
            if let Some(store_arc) = store {
                // parse sid from headers
                let cookie_header = headers.get(axum::http::header::COOKIE).and_then(|v| v.to_str().ok()).unwrap_or("");
                let sid_opt = cookie_header.split(';').map(|s| s.trim()).find_map(|part| {
                    let mut kv = part.splitn(2, '=');
                    match (kv.next(), kv.next()) {
                        (Some(k), Some(v)) if k == "sid" => Some(v.to_string()),
                        _ => None,
                    }
                });
                if let Some(sid) = sid_opt {
                    let mut guard = store_arc.lock().await;
                    let key = format!("history:{}", sid);
                    let payload_str = serde_json::to_string(&req.payload).unwrap_or_else(|_| "null".to_string());
                    let res: Result<(), redis::RedisError> = async {
                        let _ : () = guard.conn.lpush(&key, payload_str).await?;
                        let _ : () = guard.conn.ltrim(&key, 0, 49).await?;
                        let _ : () = guard.conn.expire(&key, 3600).await?;
                        Ok(())
                    }.await;
                    match res {
                        Ok(()) => (StatusCode::CREATED, axum::Json(serde_json::json!({"note": "stored in session history"}))).into_response(),
                        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error": format!("redis error: {}", e)}))).into_response(),
                    }
                } else {
                    // fallback to DB anonymous
                    let row = sqlx::query("INSERT INTO dice_rolls (user_id, payload) VALUES (NULL, $1) RETURNING id::text")
                        .bind(req.payload)
                        .fetch_one(&*pool)
                        .await;
                    match row {
                        Ok(rec) => {
                            let id: String = rec.try_get("id").unwrap_or_else(|_| "".to_string());
                            (StatusCode::CREATED, axum::Json(serde_json::json!({"id": id, "note": "stored as anonymous"}))).into_response()
                        }
                        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error": format!("DB error: {}", e)}))).into_response(),
                    }
                }
            } else {
                // no redis, persist anonymous
                let row = sqlx::query("INSERT INTO dice_rolls (user_id, payload) VALUES (NULL, $1) RETURNING id::text")
                    .bind(req.payload)
                    .fetch_one(&*pool)
                    .await;
                match row {
                    Ok(rec) => {
                        let id: String = rec.try_get("id").unwrap_or_else(|_| "".to_string());
                        (StatusCode::CREATED, axum::Json(serde_json::json!({"id": id, "note": "stored as anonymous"}))).into_response()
                    }
                    Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error": format!("DB error: {}", e)}))).into_response(),
                }
            }
        }
    }
}

// GET /api/tools/dice/history
pub async fn history(
    auth: Result<AuthenticatedUser, (StatusCode, String)>,
    Extension(pool): Extension<Arc<PgPool>>,
    Extension(store): Extension<Option<Arc<Mutex<SessionStore>>>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    match auth {
        Ok(AuthenticatedUser(user)) => {
            // return last 50 entries for user
            let rows = sqlx::query("SELECT id::text as id, payload, created_at FROM dice_rolls WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50")
                .bind(user.id)
                .fetch_all(&*pool)
                .await;
            match rows {
                Ok(rs) => {
                    let mut out: Vec<HistoryEntry> = Vec::new();
                    for r in rs {
                        let id: Option<String> = r.try_get("id").ok();
                        let payload: JsonValue = r.try_get("payload").unwrap_or(serde_json::json!(null));
                        let created_at: chrono::DateTime<chrono::Utc> = r.try_get("created_at").unwrap_or(chrono::Utc::now());
                        out.push(HistoryEntry { id, payload, created_at: created_at.to_rfc3339() });
                    }
                    (StatusCode::OK, axum::Json(out)).into_response()
                }
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error": format!("DB error: {}", e)}))).into_response(),
            }
        }
        Err(_) => {
            // Try Redis session-backed anonymous history
            if let Some(store) = store {
                // parse sid from headers
                let cookie_header = headers.get(axum::http::header::COOKIE).and_then(|v| v.to_str().ok()).unwrap_or("");
                let sid_opt = cookie_header.split(';').map(|s| s.trim()).find_map(|part| {
                    let mut kv = part.splitn(2, '=');
                    match (kv.next(), kv.next()) {
                        (Some(k), Some(v)) if k == "sid" => Some(v.to_string()),
                        _ => None,
                    }
                });
                if let Some(sid) = sid_opt {
                    let mut guard = store.lock().await;
                    let key = format!("history:{}", sid);
                    let vals: Result<Vec<String>, redis::RedisError> = guard.conn.lrange(&key, 0, 49).await;
                    match vals {
                        Ok(list) => {
                            let now = Utc::now().to_rfc3339();
                            let out: Vec<HistoryEntry> = list.into_iter().map(|s| {
                                let v: JsonValue = serde_json::from_str(&s).unwrap_or(serde_json::json!(null));
                                HistoryEntry { id: None, payload: v, created_at: now.clone() }
                            }).collect();
                            return (StatusCode::OK, axum::Json(out)).into_response();
                        }
                        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error": format!("redis error: {}", e)}))).into_response(),
                    }
                }
            }
            // Fallback: unauthorized
            (StatusCode::UNAUTHORIZED, axum::Json(serde_json::json!({"error":"unauthorized"}))).into_response()
        }
    }
}
