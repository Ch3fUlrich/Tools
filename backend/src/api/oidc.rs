use crate::tools::session::SessionStore;
use axum::extract::{Extension, Query};
use axum::http::{header, HeaderMap, StatusCode};
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine as _;
use openidconnect::core::{CoreClient, CoreProviderMetadata};
use openidconnect::reqwest::{redirect, Client, ClientBuilder};
use openidconnect::{
    AuthenticationFlow, AuthorizationCode, ClientId, ClientSecret, CsrfToken, IssuerUrl, Nonce,
    RedirectUrl, TokenResponse,
};
use rand::RngCore;
use serde::Deserialize;
use sqlx::PgPool;
use sqlx::Row;
use std::sync::Arc;
use tokio::sync::Mutex;

fn build_oidc_http_client() -> Result<Client, openidconnect::reqwest::Error> {
    ClientBuilder::new()
        // Following redirects during discovery/token exchange can open SSRF risks.
        .redirect(redirect::Policy::none())
        .build()
}

#[derive(Deserialize)]
pub struct OidcCallbackQuery {
    code: String,
    state: Option<String>,
}

#[derive(Deserialize)]
pub struct OidcStartQuery {
    pub _redirect_to: Option<String>,
}

async fn create_oauth_user(
    pool: &PgPool,
    email: Option<String>,
    subject: &str,
    provider: &str,
) -> Result<sqlx::types::Uuid, String> {
    let em = email.clone().unwrap_or_else(|| format!("{}@oauth", subject));
    let rec = sqlx::query(
        "INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(&em)
    .bind("")
    .bind(None::<String>)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("DB error creating user: {e}"))?;

    let id: sqlx::types::Uuid =
        rec.try_get("id").map_err(|e| format!("DB returned malformed id: {e}"))?;

    sqlx::query(
        "INSERT INTO oauth_accounts (user_id, provider, provider_subject, metadata) VALUES ($1, $2, $3, $4)",
    )
    .bind(id)
    .bind(provider)
    .bind(subject)
    .bind(serde_json::json!({"email": email}))
    .execute(pool)
    .await
    .map_err(|e| format!("DB error linking account: {e}"))?;

    Ok(id)
}

pub async fn start(
    Query(_q): Query<OidcStartQuery>,
    Extension(store): Extension<Option<Arc<Mutex<SessionStore>>>>,
) -> axum::http::Response<String> {
    let issuer = match std::env::var("OIDC_ISSUER") {
        Ok(v) => v,
        Err(_) => {
            return axum::http::Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body("OIDC_ISSUER not configured".to_string())
                .unwrap_or_default()
        }
    };
    let client_id = match std::env::var("OIDC_CLIENT_ID") {
        Ok(v) => v,
        Err(_) => {
            return axum::http::Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body("OIDC_CLIENT_ID not configured".to_string())
                .unwrap_or_default()
        }
    };
    let redirect = match std::env::var("OIDC_REDIRECT_URI") {
        Ok(v) => v,
        Err(_) => {
            return axum::http::Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body("OIDC_REDIRECT_URI not configured".to_string())
                .unwrap_or_default()
        }
    };

    let issuer_url = match IssuerUrl::new(issuer.clone()) {
        Ok(u) => u,
        Err(e) => {
            return axum::http::Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(format!("invalid OIDC_ISSUER: {e}"))
                .unwrap_or_default()
        }
    };

    let http_client = match build_oidc_http_client() {
        Ok(client) => client,
        Err(e) => {
            return axum::http::Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(format!("OIDC HTTP client failed: {e}"))
                .unwrap_or_default()
        }
    };

    let provider_metadata =
        match CoreProviderMetadata::discover_async(issuer_url, &http_client).await {
            Ok(m) => m,
            Err(e) => {
                return axum::http::Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .body(format!("OIDC discovery failed: {e}"))
                    .unwrap_or_default()
            }
        };
    let client = CoreClient::from_provider_metadata(
        provider_metadata,
        ClientId::new(client_id.clone()),
        None,
    )
    .set_redirect_uri(match RedirectUrl::new(redirect.clone()) {
        Ok(r) => r,
        Err(e) => {
            return axum::http::Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(format!("invalid OIDC_REDIRECT_URI: {e}"))
                .unwrap_or_default()
        }
    });

    // generate state and nonce
    let mut state_bytes = [0u8; 16];
    rand::rng().fill_bytes(&mut state_bytes);
    let state = URL_SAFE_NO_PAD.encode(state_bytes);
    let mut nonce_bytes = [0u8; 16];
    rand::rng().fill_bytes(&mut nonce_bytes);
    let nonce = URL_SAFE_NO_PAD.encode(nonce_bytes);

    if let Some(store_arc) = store {
        let mut guard = store_arc.lock().await;
        let _ = guard.store_oidc_state(&state, &nonce, 600).await;
    }

    let auth_req = client.authorize_url(
        AuthenticationFlow::<openidconnect::core::CoreResponseType>::AuthorizationCode,
        move || CsrfToken::new(state),
        move || Nonce::new(nonce),
    );
    let (url_val, _, _) = auth_req.url();
    let url = url_val.to_string();
    axum::http::Response::builder()
        .status(StatusCode::FOUND)
        .header(header::LOCATION, url)
        .body(String::new())
        .unwrap_or_default()
}

fn error_response(status: StatusCode, message: impl Into<String>) -> axum::http::Response<String> {
    axum::http::Response::builder().status(status).body(message.into()).unwrap_or_default()
}

// Callback: exchanges code, verifies ID token, finds/creates user, links oauth_account, creates session
pub async fn callback(
    Query(q): Query<OidcCallbackQuery>,
    Extension(pool): Extension<Arc<PgPool>>,
    Extension(store): Extension<Option<Arc<Mutex<SessionStore>>>>,
    _headers: HeaderMap,
) -> axum::http::Response<String> {
    if q.code.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "missing code");
    }

    let issuer = match std::env::var("OIDC_ISSUER") {
        Ok(v) => v,
        Err(_) => {
            return error_response(StatusCode::INTERNAL_SERVER_ERROR, "OIDC_ISSUER not configured")
        }
    };
    let client_id = match std::env::var("OIDC_CLIENT_ID") {
        Ok(v) => v,
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "OIDC_CLIENT_ID not configured",
            )
        }
    };
    let client_secret = match std::env::var("OIDC_CLIENT_SECRET") {
        Ok(v) => v,
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "OIDC_CLIENT_SECRET not configured",
            )
        }
    };
    let redirect = match std::env::var("OIDC_REDIRECT_URI") {
        Ok(v) => v,
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "OIDC_REDIRECT_URI not configured",
            )
        }
    };

    // Discover provider
    let issuer_url = match IssuerUrl::new(issuer.clone()) {
        Ok(u) => u,
        Err(e) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("invalid OIDC_ISSUER: {e}"),
            )
        }
    };

    let http_client = match build_oidc_http_client() {
        Ok(client) => client,
        Err(e) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("OIDC HTTP client failed: {e}"),
            )
        }
    };

    let provider_metadata =
        match CoreProviderMetadata::discover_async(issuer_url, &http_client).await {
            Ok(m) => m,
            Err(e) => {
                return error_response(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("OIDC discovery failed: {e}"),
                )
            }
        };

    let client = CoreClient::from_provider_metadata(
        provider_metadata,
        ClientId::new(client_id.clone()),
        Some(ClientSecret::new(client_secret.clone())),
    )
    .set_redirect_uri(match RedirectUrl::new(redirect.clone()) {
        Ok(r) => r,
        Err(e) => {
            return axum::http::Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(format!("invalid OIDC_REDIRECT_URI: {e}"))
                .unwrap_or_default()
        }
    });

    // Exchange code for token
    let token_request = match client.exchange_code(AuthorizationCode::new(q.code.clone())) {
        Ok(req) => req,
        Err(e) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("OIDC token request setup failed: {e}"),
            )
        }
    };

    let token_response = match token_request.request_async(&http_client).await {
        Ok(t) => t,
        Err(e) => {
            return error_response(StatusCode::BAD_REQUEST, format!("token exchange failed: {e}"))
        }
    };

    // Extract id_token claims if present
    let id_token_opt = token_response.id_token().cloned();
    let (claims, stored_nonce) = if let Some(idt) = id_token_opt {
        // Get stored nonce from state if available
        let stored_nonce = if let Some(store_arc) = &store {
            if let Some(state) = &q.state {
                let mut guard = store_arc.lock().await;
                guard.take_oidc_nonce(state).await.ok().flatten()
            } else {
                None
            }
        } else {
            None
        };

        let nonce_for_verification = stored_nonce.as_deref().unwrap_or("nonce");
        let claims_result = idt
            .claims(&client.id_token_verifier(), &Nonce::new(nonce_for_verification.to_string()))
            .ok()
            .cloned();
        (claims_result, stored_nonce)
    } else {
        (None, None)
    };

    // Obtain subject and optional email from ID token claims
    let subject = claims.as_ref().map(|c| c.subject().to_string()).unwrap_or_default();
    let email = claims.as_ref().and_then(|c| c.email().map(|e| e.to_string()));

    if subject.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "missing subject in id token");
    }

    // Find oauth_account by provider + subject
    let provider = issuer; // use issuer as provider name
    let row = sqlx::query(
        "SELECT user_id FROM oauth_accounts WHERE provider = $1 AND provider_subject = $2",
    )
    .bind(&provider)
    .bind(&subject)
    .fetch_optional(&*pool)
    .await;

    let user_id = match row {
        Ok(Some(rec)) => rec.try_get::<sqlx::types::Uuid, _>("user_id").ok(),
        Ok(None) => None,
        Err(e) => {
            return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("DB error: {e}"))
        }
    };

    let uid = if let Some(uid) = user_id {
        uid
    } else {
        match create_oauth_user(&pool, email.clone(), &subject, &provider).await {
            Ok(id) => id,
            Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, e),
        }
    };

    // Validate state/nonce if we stored them during start
    if let Some(store_arc) = store {
        let mut guard = store_arc.lock().await;
        // attempt to take nonce by state
        if q.state.is_some() {
            if let Some(stored_nonce) = stored_nonce {
                // compare nonces if claims provided
                if let Some(token_nonce) = claims.as_ref().and_then(|c| c.nonce()) {
                    if token_nonce.secret() != stored_nonce.as_str() {
                        return error_response(StatusCode::BAD_REQUEST, "nonce mismatch");
                    }
                }
            } else {
                // no stored state; continue but warn
                tracing::warn!(
                    "OIDC callback without stored state/nonce - CSRF protection disabled"
                );
            }
        }

        // Create session
        match guard.create_session(uid, 60 * 60 * 24).await {
            Ok(sid) => {
                // Only add Secure flag when not running on localhost
                let secure_flag = match std::env::var("ALLOWED_ORIGINS") {
                    Ok(origins)
                        if origins.contains("localhost") || origins.contains("127.0.0.1") =>
                    {
                        ""
                    }
                    _ => "; Secure",
                };
                let cookie = format!("sid={sid}; HttpOnly; Path=/; SameSite=Lax{secure_flag}");
                // Redirect to frontend (if configured) with cookie set
                let frontend = std::env::var("FRONTEND_URL").unwrap_or_else(|_| "/".to_string());
                let http_resp = axum::http::Response::builder()
                    .status(StatusCode::FOUND)
                    .header(header::SET_COOKIE, cookie)
                    .header(header::LOCATION, frontend)
                    .body(String::new())
                    .unwrap_or_default();
                return http_resp;
            }
            Err(e) => {
                return error_response(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("session create failed: {e}"),
                )
            }
        }
    }

    // If no session store present, just return link result
    axum::http::Response::builder()
        .status(StatusCode::OK)
        .body(format!("linked user {uid}"))
        .unwrap_or_default()
}
