use axum::extract::{Query, Extension};
use axum::http::{StatusCode, header, HeaderMap};
use serde::Deserialize;
use openidconnect::core::{CoreProviderMetadata, CoreClient};
use openidconnect::{IssuerUrl, ClientId, ClientSecret, RedirectUrl, AuthorizationCode, Nonce, CsrfToken, TokenResponse, AuthenticationFlow};
use sqlx::Row;
use openidconnect::reqwest::async_http_client;
use sqlx::PgPool;
use crate::tools::session::SessionStore;
use std::sync::Arc;
use tokio::sync::Mutex;
use rand::RngCore;
use rand::rngs::OsRng;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine as _;

#[derive(Deserialize)]
pub struct OidcCallbackQuery {
    code: String,
    state: Option<String>,
}

#[derive(Deserialize)]
pub struct OidcStartQuery {
    pub _redirect_to: Option<String>,
}

pub async fn start(
    Query(_q): Query<OidcStartQuery>,
    Extension(store): Extension<Option<Arc<Mutex<SessionStore>>>>,
) -> axum::http::Response<String> {
    let issuer = match std::env::var("OIDC_ISSUER") { Ok(v) => v, Err(_) => return axum::http::Response::builder().status(StatusCode::INTERNAL_SERVER_ERROR).body("OIDC_ISSUER not configured".to_string()).unwrap() };
    let client_id = match std::env::var("OIDC_CLIENT_ID") { Ok(v) => v, Err(_) => return axum::http::Response::builder().status(StatusCode::INTERNAL_SERVER_ERROR).body("OIDC_CLIENT_ID not configured".to_string()).unwrap() };
    let redirect = match std::env::var("OIDC_REDIRECT_URI") { Ok(v) => v, Err(_) => return axum::http::Response::builder().status(StatusCode::INTERNAL_SERVER_ERROR).body("OIDC_REDIRECT_URI not configured".to_string()).unwrap() };

    let provider_metadata = match CoreProviderMetadata::discover_async(IssuerUrl::new(issuer.clone()).unwrap(), async_http_client).await {
        Ok(m) => m,
        Err(e) => return axum::http::Response::builder().status(StatusCode::INTERNAL_SERVER_ERROR).body(format!("OIDC discovery failed: {}", e)).unwrap(),
    };
    let client = CoreClient::from_provider_metadata(
        provider_metadata,
        ClientId::new(client_id.clone()),
        None,
    ).set_redirect_uri(RedirectUrl::new(redirect).unwrap());

    // generate state and nonce
    let mut state_bytes = [0u8; 16];
    OsRng.fill_bytes(&mut state_bytes);
    let state = URL_SAFE_NO_PAD.encode(&state_bytes);
    let mut nonce_bytes = [0u8; 16];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = URL_SAFE_NO_PAD.encode(&nonce_bytes);

    if let Some(store_arc) = store {
        let mut guard = store_arc.lock().await;
        let _ = guard.store_oidc_state(&state, &nonce, 600).await;
    }

    let auth_req = client.authorize_url(AuthenticationFlow::<openidconnect::core::CoreResponseType>::AuthorizationCode, move || CsrfToken::new(state.clone()), move || Nonce::new(nonce.clone()));
    let (url_val, _, _) = auth_req.url();
    let url = url_val.to_string();
    axum::http::Response::builder()
        .status(StatusCode::FOUND)
        .header(header::LOCATION, url)
        .body(String::new())
        .unwrap()
}

// Callback: exchanges code, verifies ID token, finds/creates user, links oauth_account, creates session
pub async fn callback(
    Query(q): Query<OidcCallbackQuery>,
    Extension(pool): Extension<Arc<PgPool>>,
    Extension(store): Extension<Option<Arc<Mutex<SessionStore>>>>,
    _headers: HeaderMap,
) -> axum::http::Response<String> {
    if q.code.is_empty() {
        return axum::http::Response::builder().status(StatusCode::BAD_REQUEST).body("missing code".to_string()).unwrap();
    }

    let issuer = match std::env::var("OIDC_ISSUER") { Ok(v) => v, Err(_) => return axum::http::Response::builder().status(StatusCode::INTERNAL_SERVER_ERROR).body("OIDC_ISSUER not configured".to_string()).unwrap() };
    let client_id = match std::env::var("OIDC_CLIENT_ID") { Ok(v) => v, Err(_) => return axum::http::Response::builder().status(StatusCode::INTERNAL_SERVER_ERROR).body("OIDC_CLIENT_ID not configured".to_string()).unwrap() };
    let client_secret = match std::env::var("OIDC_CLIENT_SECRET") { Ok(v) => v, Err(_) => return axum::http::Response::builder().status(StatusCode::INTERNAL_SERVER_ERROR).body("OIDC_CLIENT_SECRET not configured".to_string()).unwrap() };
    let redirect = match std::env::var("OIDC_REDIRECT_URI") { Ok(v) => v, Err(_) => return axum::http::Response::builder().status(StatusCode::INTERNAL_SERVER_ERROR).body("OIDC_REDIRECT_URI not configured".to_string()).unwrap() };

    // Discover provider
    let provider_metadata = match CoreProviderMetadata::discover_async(IssuerUrl::new(issuer.clone()).unwrap(), async_http_client).await {
        Ok(m) => m,
        Err(e) => return axum::http::Response::builder().status(StatusCode::INTERNAL_SERVER_ERROR).body(format!("OIDC discovery failed: {}", e)).unwrap(),
    };

    let client = CoreClient::from_provider_metadata(
        provider_metadata,
        ClientId::new(client_id.clone()),
        Some(ClientSecret::new(client_secret.clone())),
    ).set_redirect_uri(RedirectUrl::new(redirect).unwrap());

    // Exchange code for token
    let token_response = match client.exchange_code(AuthorizationCode::new(q.code.clone())).request_async(async_http_client).await {
        Ok(t) => t,
        Err(e) => return axum::http::Response::builder().status(StatusCode::BAD_REQUEST).body(format!("token exchange failed: {}", e)).unwrap(),
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
        let claims_result = idt.claims(&client.id_token_verifier(), &Nonce::new(nonce_for_verification.to_string())).ok().cloned();
        (claims_result, stored_nonce)
    } else {
        (None, None)
    };

    // Obtain subject and optional email from ID token claims
    let subject = claims.as_ref().map(|c| c.subject().to_string()).unwrap_or_default();
    let email = claims.as_ref().and_then(|c| c.email().map(|e| e.to_string()));

    if subject.is_empty() {
        return axum::http::Response::builder().status(StatusCode::BAD_REQUEST).body("missing subject in id token".to_string()).unwrap();
    }

    // Find oauth_account by provider + subject
    let provider = issuer; // use issuer as provider name
    let row = sqlx::query("SELECT user_id FROM oauth_accounts WHERE provider = $1 AND provider_subject = $2")
        .bind(&provider)
        .bind(&subject)
        .fetch_optional(&*pool)
        .await;

    let user_id = match row {
        Ok(Some(rec)) => rec.try_get::<sqlx::types::Uuid, _>("user_id").ok().map(|u| u.into()),
        Ok(None) => None,
        Err(e) => return axum::http::Response::builder().status(StatusCode::INTERNAL_SERVER_ERROR).body(format!("DB error: {}", e)).unwrap(),
    };

    let uid = if let Some(uid) = user_id {
        uid
    } else {
        // create new user
        let em = email.clone().unwrap_or_else(|| format!("{}@oauth", &subject));
        let rec = sqlx::query("INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id")
            .bind(&em)
            .bind("")
            .bind(None::<String>)
            .fetch_one(&*pool)
        .await
        .map_err(|e| axum::http::Response::builder().status(StatusCode::INTERNAL_SERVER_ERROR).body(format!("DB error creating user: {}", e)).unwrap()).unwrap();
        let id: sqlx::types::Uuid = rec.try_get("id").unwrap();
        let id = id.into();
        // insert oauth_account
        let _ = sqlx::query("INSERT INTO oauth_accounts (user_id, provider, provider_subject, metadata) VALUES ($1, $2, $3, $4)")
            .bind(id)
            .bind(&provider)
            .bind(&subject)
            .bind(serde_json::json!({"email": email}))
            .execute(&*pool)
            .await;
        id
    };

    // Validate state/nonce if we stored them during start
    if let Some(store_arc) = store {
        let mut guard = store_arc.lock().await;
        // attempt to take nonce by state
        if let Some(_state) = q.state.clone() {
            if let Some(stored_nonce) = stored_nonce {
                // compare nonces if claims provided
                if let Some(c) = &claims {
                    if let Some(token_nonce) = c.nonce() {
                        if token_nonce.secret() != stored_nonce.as_str() {
                            return axum::http::Response::builder().status(StatusCode::BAD_REQUEST).body("nonce mismatch".to_string()).unwrap();
                        }
                    }
                }
            } else {
                // no stored state; continue but warn
                tracing::warn!("OIDC callback without stored state/nonce - CSRF protection disabled");
            }
        }

        // Create session
        match guard.create_session(uid, 60*60*24).await {
            Ok(sid) => {
                let cookie = format!("sid={}; HttpOnly; Path=/; SameSite=Lax; Secure", sid);
                // Redirect to frontend (if configured) with cookie set
                let frontend = std::env::var("FRONTEND_URL").unwrap_or_else(|_| "/".to_string());
                let http_resp = axum::http::Response::builder()
                    .status(StatusCode::FOUND)
                    .header(header::SET_COOKIE, cookie)
                    .header(header::LOCATION, frontend)
                    .body(String::new())
                    .unwrap();
                return http_resp;
            }
                Err(e) => return axum::http::Response::builder().status(StatusCode::INTERNAL_SERVER_ERROR).body(format!("session create failed: {}", e)).unwrap(),
        }
    }

    // If no session store present, just return link result
    axum::http::Response::builder().status(StatusCode::OK).body(format!("linked user {}", uid.to_string())).unwrap()
}
