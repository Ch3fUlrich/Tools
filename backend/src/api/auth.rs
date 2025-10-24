use axum::{extract::{Json, Extension}, http::{StatusCode, header, Response}, response::IntoResponse, Json as AxumJson};
use sqlx::Row;
use serde::Deserialize;
use sqlx::PgPool;
use std::sync::Arc;
use serde_json::json;
// uuid::Uuid imported where needed in other modules; not used directly here
use crate::tools::auth as auth_tools;
use crate::tools::session::SessionStore;
use axum::http::HeaderMap;

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub display_name: Option<String>,
}

pub async fn register(
    Extension(pool): Extension<Arc<PgPool>>,
    Json(payload): Json<RegisterRequest>,
) -> impl IntoResponse {
    match auth_tools::register_user(&*pool, &payload.email, &payload.password, payload.display_name.as_deref()).await {
        Ok(id) => (StatusCode::CREATED, AxumJson(json!({"id": id.to_string()}))),
        Err(e) => {
            tracing::error!("register failed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, AxumJson(json!({"error":"internal"})))
        }
    }
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

pub async fn login(
    Extension(pool): Extension<Arc<PgPool>>,
    Extension(store): Extension<Arc<tokio::sync::Mutex<SessionStore>>>,
    Json(payload): Json<LoginRequest>,
) -> Response<String> {
    // Verify user exists and password (runtime query)
    let row = sqlx::query("SELECT id, password_hash FROM users WHERE lower(email)=lower($1)")
        .bind(&payload.email)
        .fetch_optional(&*pool)
        .await;
    match row {
        Ok(Some(rec)) => {
            let pwd: Option<String> = rec.try_get("password_hash").ok();
            let pwd = pwd.unwrap_or_default();
            if auth_tools::verify_password(&pwd, &payload.password).await.unwrap_or(false) {
                // create session
                let uid: uuid::Uuid = rec.try_get("id").unwrap();
                let mut guard = store.lock().await;
                let sid = guard.create_session(uid, 60*60*24).await.unwrap();
                // set cookie
                let cookie = format!("sid={}; HttpOnly; Path=/; SameSite=Lax; Secure", sid);
                let body = serde_json::to_string(&json!({"ok": true})).unwrap();
                return Response::builder().status(StatusCode::OK).header(header::SET_COOKIE, cookie).body(body).unwrap();
            }
            Response::builder().status(StatusCode::UNAUTHORIZED).body(serde_json::to_string(&json!({"error":"invalid credentials"})).unwrap()).unwrap()
        }
        _ => Response::builder().status(StatusCode::UNAUTHORIZED).body(serde_json::to_string(&json!({"error":"invalid credentials"})).unwrap()).unwrap(),
    }
}

pub async fn logout(
    Extension(store): Extension<Arc<tokio::sync::Mutex<SessionStore>>>,
    _headers: HeaderMap,
) -> Response<String> {
    // Note: `_headers` kept for signature compatibility but not used directly here.
    // If cookie parsing is needed later, replace `_headers` with `headers`.
    if let Some(val) = _headers.get(header::COOKIE) {
        if let Ok(s) = val.to_str() {
            // parse simple sid cookie
            for part in s.split(';') {
                let kv: Vec<&str> = part.trim().splitn(2, '=').collect();
                if kv.len() == 2 && kv[0] == "sid" {
                    let sid = kv[1];
                    let mut guard = store.lock().await;
                    let _ = guard.destroy_session(sid).await;
                }
            }
        }
    }
    // clear cookie
    let cookie = "sid=deleted; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    Response::builder().status(StatusCode::OK).header(header::SET_COOKIE, cookie).body(serde_json::to_string(&json!({"ok":true})).unwrap()).unwrap()
}
