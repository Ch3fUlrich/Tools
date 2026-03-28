use crate::middleware::session_middleware::AuthenticatedUser;
use crate::tools::auth as auth_tools;
use crate::tools::session::SessionStore;
use axum::http::HeaderMap;
use axum::{
    extract::{Extension, Json},
    http::{header, Response, StatusCode},
    response::IntoResponse,
    Json as AxumJson,
};
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use sqlx::Row;
use std::sync::Arc;

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
    match auth_tools::register_user(
        &pool,
        &payload.email,
        &payload.password,
        payload.display_name.as_deref(),
    )
    .await
    {
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
    Extension(store_opt): Extension<Option<Arc<tokio::sync::Mutex<SessionStore>>>>,
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
                let uid: uuid::Uuid = match rec.try_get("id") {
                    Ok(u) => u,
                    Err(e) => {
                        tracing::error!("failed to read id column: {}", e);
                        return Response::builder()
                            .status(StatusCode::INTERNAL_SERVER_ERROR)
                            .body(
                                serde_json::to_string(&json!({"error":"internal"}))
                                    .unwrap_or_else(|_| "{\"error\":\"internal\"}".to_string()),
                            )
                            .unwrap();
                    }
                };

                let store = match store_opt {
                    Some(s) => s,
                    None => {
                        return Response::builder()
                            .status(StatusCode::SERVICE_UNAVAILABLE)
                            .body(
                                serde_json::to_string(
                                    &json!({"error":"session store unavailable"}),
                                )
                                .unwrap_or_else(|_| {
                                    "{\"error\":\"session store unavailable\"}".to_string()
                                }),
                            )
                            .unwrap();
                    }
                };
                let mut guard = store.lock().await;
                let sid = match guard.create_session(uid, 60 * 60 * 24).await {
                    Ok(s) => s,
                    Err(e) => {
                        tracing::error!("failed to create session: {}", e);
                        return Response::builder()
                            .status(StatusCode::INTERNAL_SERVER_ERROR)
                            .body(
                                serde_json::to_string(&json!({"error":"internal"}))
                                    .unwrap_or_else(|_| "{\"error\":\"internal\"}".to_string()),
                            )
                            .unwrap();
                    }
                };

                // set cookie — only add Secure flag when not running on localhost
                let secure_flag = match std::env::var("ALLOWED_ORIGINS") {
                    Ok(origins)
                        if origins.contains("localhost") || origins.contains("127.0.0.1") =>
                    {
                        ""
                    }
                    _ => "; Secure",
                };
                let cookie = format!("sid={sid}; HttpOnly; Path=/; SameSite=Lax{secure_flag}");
                let body = serde_json::to_string(&json!({"ok": true}))
                    .unwrap_or_else(|_| "{\"ok\":true}".to_string());
                return Response::builder()
                    .status(StatusCode::OK)
                    .header(header::SET_COOKIE, cookie)
                    .body(body)
                    .unwrap();
            }
            Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .body(
                    serde_json::to_string(&json!({"error":"invalid credentials"}))
                        .unwrap_or_else(|_| "{\"error\":\"invalid credentials\"}".to_string()),
                )
                .unwrap()
        }
        _ => Response::builder()
            .status(StatusCode::UNAUTHORIZED)
            .body(
                serde_json::to_string(&json!({"error":"invalid credentials"}))
                    .unwrap_or_else(|_| "{\"error\":\"invalid credentials\"}".to_string()),
            )
            .unwrap(),
    }
}

pub async fn logout(
    Extension(store_opt): Extension<Option<Arc<tokio::sync::Mutex<SessionStore>>>>,
    _headers: HeaderMap,
) -> Response<String> {
    if let Some(store) = store_opt {
        if let Some(val) = _headers.get(header::COOKIE) {
            if let Ok(s) = val.to_str() {
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
    }
    // clear cookie
    let cookie = "sid=deleted; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    Response::builder()
        .status(StatusCode::OK)
        .header(header::SET_COOKIE, cookie)
        .body(
            serde_json::to_string(&json!({"ok":true}))
                .unwrap_or_else(|_| "{\"ok\":true}".to_string()),
        )
        .unwrap()
}

pub async fn get_profile(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
) -> impl IntoResponse {
    let row = sqlx::query("SELECT id, email, display_name, created_at FROM users WHERE id = $1")
        .bind(user.id)
        .fetch_one(&*pool)
        .await;
    match row {
        Ok(rec) => {
            let id: uuid::Uuid = rec.try_get("id").unwrap_or_default();
            let email: String = rec.try_get("email").unwrap_or_default();
            let display_name: Option<String> = rec.try_get("display_name").ok().flatten();
            let created_at: chrono::DateTime<chrono::Utc> =
                rec.try_get("created_at").unwrap_or_else(|_| chrono::Utc::now());
            (
                StatusCode::OK,
                AxumJson(json!({
                    "id": id.to_string(),
                    "email": email,
                    "display_name": display_name,
                    "created_at": created_at.to_rfc3339()
                })),
            )
        }
        Err(e) => {
            tracing::error!("get_profile failed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, AxumJson(json!({"error": "internal"})))
        }
    }
}

#[derive(Deserialize)]
pub struct UpdateProfileRequest {
    pub display_name: Option<String>,
}

pub async fn update_profile(
    AuthenticatedUser(user): AuthenticatedUser,
    Extension(pool): Extension<Arc<PgPool>>,
    Json(payload): Json<UpdateProfileRequest>,
) -> impl IntoResponse {
    let result = sqlx::query("UPDATE users SET display_name = $1 WHERE id = $2")
        .bind(&payload.display_name)
        .bind(user.id)
        .execute(&*pool)
        .await;
    match result {
        Ok(_) => (StatusCode::OK, AxumJson(json!({"ok": true}))),
        Err(e) => {
            tracing::error!("update_profile failed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, AxumJson(json!({"error": "internal"})))
        }
    }
}
