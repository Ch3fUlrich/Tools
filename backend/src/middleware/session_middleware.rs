use crate::tools::auth::AuthUser;
use crate::tools::session::SessionStore;
use axum::async_trait;
use axum::extract::FromRequestParts;
use axum::http::StatusCode;
use axum::http::{header, request::Parts};
use sqlx::PgPool;
use sqlx::Row;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AuthenticatedUser(pub AuthUser);

#[async_trait]
impl<S> FromRequestParts<S> for AuthenticatedUser
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // Extract cookie header
        let headers = &parts.headers;
        let cookie_header = headers
            .get(header::COOKIE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        if cookie_header.is_empty() {
            return Err((StatusCode::UNAUTHORIZED, "No session cookie".to_string()));
        }

        // parse sid from cookie header using the SessionStore helper
        let sid = crate::tools::session::SessionStore::parse_sid_from_cookie(cookie_header)
            .ok_or((StatusCode::UNAUTHORIZED, "No sid cookie".to_string()))?;

        // Extract session store from request extensions (expected to be Extension<Option<Arc<Mutex<SessionStore>>>>)
        let store = parts
            .extensions
            .get::<Option<Arc<Mutex<SessionStore>>>>()
            .ok_or((
                StatusCode::INTERNAL_SERVER_ERROR,
                "Session store extension missing".to_string(),
            ))?
            .clone()
            .ok_or((StatusCode::UNAUTHORIZED, "No session store configured".to_string()))?;

        // Lock and query session
        let mut guard = store.lock().await;
        match guard.get_session(&sid).await {
            Ok(Some(sess)) => {
                // Load user from DB
                let pool = parts
                    .extensions
                    .get::<Arc<PgPool>>()
                    .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "DB pool missing".to_string()))?
                    .clone();
                let row = sqlx::query("SELECT id, email, display_name FROM users WHERE id = $1")
                    .bind(sess.user_id)
                    .fetch_one(&*pool)
                    .await
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB error: {e}")))?;

                let id: sqlx::types::Uuid = row.try_get("id").map_err(|e| {
                    (StatusCode::INTERNAL_SERVER_ERROR, format!("Row parse error: {e}"))
                })?;
                let email: String = row.try_get("email").map_err(|e| {
                    (StatusCode::INTERNAL_SERVER_ERROR, format!("Row parse error: {e}"))
                })?;
                let display_name: Option<String> = row.try_get("display_name").ok();
                let user = AuthUser { id, _email: email, _display_name: display_name };

                Ok(Self(user))
            }
            Ok(None) => Err((StatusCode::UNAUTHORIZED, "Session not found".to_string())),
            Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Redis error: {e}"))),
        }
    }
}
