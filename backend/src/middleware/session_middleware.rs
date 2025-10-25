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

        // parse cookies from header "key=val; key2=val2"
        let sid = cookie_header.split(';').map(str::trim).find_map(|part| {
            let mut kv = part.splitn(2, '=');
            match (kv.next(), kv.next()) {
                (Some("sid"), Some(v)) => Some(v.to_string()),
                _ => None,
            }
        });
        if sid.is_none() {
            return Err((StatusCode::UNAUTHORIZED, "No sid cookie".to_string()));
        }
        let sid = sid.unwrap();

        // Extract session store from request extensions (expected to be Extension<Option<Arc<Mutex<SessionStore>>>>)
        let store_option_any = parts.extensions.get::<Option<Arc<Mutex<SessionStore>>>>();
        if store_option_any.is_none() {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                "Session store extension missing".to_string(),
            ));
        }
        let store_option = store_option_any.unwrap();
        let store = match store_option {
            Some(s) => s.clone(),
            None => {
                return Err((
                    StatusCode::UNAUTHORIZED,
                    "No session store configured".to_string(),
                ))
            }
        };

        // Lock and query session
        let mut guard = store.lock().await;
        match guard.get_session(&sid).await {
            Ok(Some(sess)) => {
                // Load user from DB
                let pool_any = parts.extensions.get::<Arc<PgPool>>();
                if pool_any.is_none() {
                    return Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "DB pool missing".to_string(),
                    ));
                }
                let pool = pool_any.unwrap().clone();
                let row = sqlx::query("SELECT id, email, display_name FROM users WHERE id = $1")
                    .bind(sess.user_id)
                    .fetch_one(&*pool)
                    .await
                    .map_err(|e| {
                        (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            format!("DB error: {e}"),
                        )
                    })?;

                let id: sqlx::types::Uuid = row.try_get("id").map_err(|e| {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        format!("Row parse error: {e}"),
                    )
                })?;
                let email: String = row.try_get("email").map_err(|e| {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        format!("Row parse error: {e}"),
                    )
                })?;
                let display_name: Option<String> = row.try_get("display_name").ok();
                let user = AuthUser {
                    id,
                    _email: email,
                    _display_name: display_name,
                };

                Ok(Self(user))
            }
            Ok(None) => Err((StatusCode::UNAUTHORIZED, "Session not found".to_string())),
            Err(e) => Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Redis error: {e}"),
            )),
        }
    }
}
