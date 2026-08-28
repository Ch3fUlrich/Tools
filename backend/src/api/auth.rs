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

/// Whether the session cookie may travel over plain HTTP.
///
/// This used to drop `Secure` whenever ALLOWED_ORIGINS merely *contained* "localhost" —
/// so a deployment that allows both its production domain and a local dev origin shipped
/// session cookies unprotected in production. It now only relaxes when every configured
/// origin is local, and defaults to Secure when nothing is configured at all.
fn secure_cookie_flag() -> &'static str {
    match std::env::var("ALLOWED_ORIGINS") {
        Ok(origins) if !origins.trim().is_empty() => {
            let all_local = origins.split(',').map(str::trim).filter(|o| !o.is_empty()).all(|o| {
                o.starts_with("http://localhost")
                    || o.starts_with("http://127.0.0.1")
                    || o.starts_with("http://[::1]")
            });
            if all_local {
                ""
            } else {
                "; Secure"
            }
        }
        _ => "; Secure",
    }
}

/// Sent whenever a local-auth endpoint is called while Authelia is the only login method.
const LOCAL_AUTH_DISABLED: &str =
    "email + password sign-in is disabled; sign in with Authelia instead";

/// Public description of which sign-in methods this deployment actually accepts.
///
/// The frontend is a static export, so it cannot read the backend's environment at build
/// time; it asks here instead and renders the matching buttons. Deliberately unauthenticated
/// and free of secrets — it only says *which* methods exist, never any credential.
pub async fn auth_config() -> impl IntoResponse {
    let oidc_enabled = ["OIDC_ISSUER", "OIDC_CLIENT_ID", "OIDC_REDIRECT_URI"]
        .iter()
        .all(|k| std::env::var(k).is_ok_and(|v| !v.trim().is_empty()));

    (
        StatusCode::OK,
        AxumJson(json!({
            "localAuthEnabled": auth_tools::local_auth_enabled(),
            "oidcEnabled": oidc_enabled,
            "oidcProviderName": std::env::var("OIDC_PROVIDER_NAME")
                .ok()
                .filter(|v| !v.trim().is_empty())
                .unwrap_or_else(|| "Authelia".to_string()),
        })),
    )
}

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
    if !auth_tools::local_auth_enabled() {
        return (StatusCode::FORBIDDEN, AxumJson(json!({ "error": LOCAL_AUTH_DISABLED })));
    }

    // Reject bad input with a reason. Previously every failure - malformed address, short
    // password, duplicate email - came back as a blanket 500.
    if let Err(invalid) = auth_tools::validate_credentials(&payload.email, &payload.password) {
        return (StatusCode::BAD_REQUEST, AxumJson(json!({ "error": invalid.message() })));
    }

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
    if !auth_tools::local_auth_enabled() {
        return Response::builder()
            .status(StatusCode::FORBIDDEN)
            .header(header::CONTENT_TYPE, "application/json")
            .body(
                serde_json::to_string(&json!({ "error": LOCAL_AUTH_DISABLED }))
                    .unwrap_or_else(|_| "{\"error\":\"local login is disabled\"}".to_string()),
            )
            .unwrap_or_default();
    }

    let unauthorized = || {
        Response::builder()
            .status(StatusCode::UNAUTHORIZED)
            .body(
                serde_json::to_string(&json!({"error":"invalid credentials"}))
                    .unwrap_or_else(|_| "{\"error\":\"invalid credentials\"}".to_string()),
            )
            .unwrap_or_default()
    };

    let internal_error = || {
        Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .body(
                serde_json::to_string(&json!({"error":"internal"}))
                    .unwrap_or_else(|_| "{\"error\":\"internal\"}".to_string()),
            )
            .unwrap_or_default()
    };

    // Verify user exists and password (runtime query)
    let row = sqlx::query("SELECT id, password_hash FROM users WHERE lower(email)=lower($1)")
        .bind(&payload.email)
        .fetch_optional(&*pool)
        .await;

    let Ok(Some(rec)) = row else {
        // Spend the same CPU an existing account would, so a miss cannot be told from a
        // hit by timing alone. Without this, login enumerates registered addresses.
        auth_tools::verify_password_dummy(&payload.password).await;
        return unauthorized();
    };

    let pwd: Option<String> = rec.try_get("password_hash").ok();
    let Some(pwd) = pwd.filter(|p| !p.is_empty()) else {
        // An account with no password hash (registered through OIDC) must not be a fast
        // path either.
        auth_tools::verify_password_dummy(&payload.password).await;
        return unauthorized();
    };

    if !auth_tools::verify_password(&pwd, &payload.password).await.unwrap_or(false) {
        return unauthorized();
    }

    // create session
    let uid: uuid::Uuid = match rec.try_get("id") {
        Ok(u) => u,
        Err(e) => {
            tracing::error!("failed to read id column: {}", e);
            return internal_error();
        }
    };

    let Some(store) = store_opt else {
        return Response::builder()
            .status(StatusCode::SERVICE_UNAVAILABLE)
            .body(
                serde_json::to_string(&json!({"error":"session store unavailable"}))
                    .unwrap_or_else(|_| "{\"error\":\"session store unavailable\"}".to_string()),
            )
            .unwrap_or_default();
    };

    let mut guard = store.lock().await;
    let sid = match guard.create_session(uid, 60 * 60 * 24).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("failed to create session: {}", e);
            return internal_error();
        }
    };

    let cookie = format!("sid={sid}; HttpOnly; Path=/; SameSite=Lax{}", secure_cookie_flag());
    let body =
        serde_json::to_string(&json!({"ok": true})).unwrap_or_else(|_| "{\"ok\":true}".to_string());

    Response::builder()
        .status(StatusCode::OK)
        .header(header::SET_COOKIE, cookie)
        .body(body)
        .unwrap_or_default()
}

pub async fn logout(
    Extension(store_opt): Extension<Option<Arc<tokio::sync::Mutex<SessionStore>>>>,
    _headers: HeaderMap,
) -> Response<String> {
    if let Some(store) = store_opt {
        let sid_opt =
            _headers.get(header::COOKIE).and_then(|val| val.to_str().ok()).and_then(|s| {
                s.split(';').find_map(|part| {
                    let (k, v) = part.trim().split_once('=')?;
                    (k == "sid").then_some(v)
                })
            });

        if let Some(sid) = sid_opt {
            let mut guard = store.lock().await;
            let _ = guard.destroy_session(sid).await;
        }
    }
    // clear cookie
    // A clearing cookie only replaces the original when its attributes match. The session
    // cookie is set with SameSite=Lax (and Secure off localhost), so this must say the same
    // or the browser keeps the old one.
    let cookie = format!(
        "sid=deleted; HttpOnly; Path=/; SameSite=Lax{}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
        secure_cookie_flag()
    );
    Response::builder()
        .status(StatusCode::OK)
        .header(header::SET_COOKIE, cookie)
        .body(
            serde_json::to_string(&json!({"ok":true}))
                .unwrap_or_else(|_| "{\"ok\":true}".to_string()),
        )
        .unwrap_or_default()
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
