use crate::tools::session::SessionStore;
use axum::extract::{Extension, Query};
use axum::http::{header, HeaderMap, StatusCode};
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine as _;
use openidconnect::core::{CoreClient, CoreProviderMetadata};
use openidconnect::reqwest::{redirect, Client, ClientBuilder};
use openidconnect::{
    AuthenticationFlow, AuthorizationCode, ClientId, ClientSecret, CsrfToken, IssuerUrl, Nonce,
    PkceCodeChallenge, PkceCodeVerifier, RedirectUrl, TokenResponse,
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

fn error_response(status: StatusCode, msg: impl Into<String>) -> axum::http::Response<String> {
    axum::http::Response::builder().status(status).body(msg.into()).unwrap_or_default()
}

/// The parts of an Authelia ID token we persist locally.
pub struct OidcIdentity {
    pub subject: String,
    pub email: Option<String>,
    pub display_name: Option<String>,
}

impl OidcIdentity {
    /// Email to store when the provider sent none. `users.email` is `NOT NULL UNIQUE`, and
    /// the subject is stable and unique per provider, so this keeps the row insertable
    /// without inventing an address that could collide with a real one.
    fn email_or_placeholder(&self) -> String {
        self.email.clone().unwrap_or_else(|| format!("{}@oauth", self.subject))
    }
}

/// Find, link, or create the local user behind an Authelia identity.
///
/// Authelia is the only login method, so this is the *only* path that fills `users` — it has
/// to cover every case rather than just the happy one:
///
/// 1. the `(provider, subject)` pair is already linked — reuse that user, and refresh the
///    profile fields Authelia is authoritative for, so a changed email or display name
///    propagates on the next login;
/// 2. not linked, but a local user already owns the same email — link the identity to that
///    user. Inserting instead would hit the `UNIQUE` index on `lower(email)` and fail the
///    whole login with a 500, permanently locking out anyone who had a local account first;
/// 3. neither — insert the user and its `oauth_accounts` link together.
async fn provision_oidc_user(
    pool: &PgPool,
    provider: &str,
    identity: &OidcIdentity,
) -> Result<sqlx::types::Uuid, String> {
    let linked = sqlx::query(
        "SELECT user_id FROM oauth_accounts WHERE provider = $1 AND provider_subject = $2",
    )
    .bind(provider)
    .bind(&identity.subject)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("DB error looking up linked account: {e}"))?;

    if let Some(rec) = linked {
        let id: sqlx::types::Uuid =
            rec.try_get("user_id").map_err(|e| format!("DB returned malformed user_id: {e}"))?;
        refresh_profile(pool, id, identity).await?;
        return Ok(id);
    }

    let existing = match identity.email.as_deref() {
        Some(em) if !em.trim().is_empty() => {
            sqlx::query("SELECT id FROM users WHERE lower(email) = lower($1)")
                .bind(em)
                .fetch_optional(pool)
                .await
                .map_err(|e| format!("DB error looking up user by email: {e}"))?
        }
        _ => None,
    };

    let user_id: sqlx::types::Uuid = if let Some(rec) = existing {
        let id: sqlx::types::Uuid =
            rec.try_get("id").map_err(|e| format!("DB returned malformed id: {e}"))?;
        refresh_profile(pool, id, identity).await?;
        id
    } else {
        // `password_hash` stays NULL: there is no local password to set, and NULL says
        // "this account cannot be signed into locally" far better than an empty string,
        // which `verify_password` would otherwise have to reject by accident.
        let rec = sqlx::query(
            "INSERT INTO users (email, password_hash, display_name) VALUES ($1, NULL, $2) RETURNING id",
        )
        .bind(identity.email_or_placeholder())
        .bind(identity.display_name.as_deref())
        .fetch_one(pool)
        .await
        .map_err(|e| format!("DB error creating user: {e}"))?;

        rec.try_get("id").map_err(|e| format!("DB returned malformed id: {e}"))?
    };

    // ON CONFLICT keeps two logins racing on a first sign-in from failing one of them with
    // a UNIQUE violation on (provider, provider_subject).
    sqlx::query(
        "INSERT INTO oauth_accounts (user_id, provider, provider_subject, metadata) VALUES ($1, $2, $3, $4) ON CONFLICT (provider, provider_subject) DO NOTHING",
    )
    .bind(user_id)
    .bind(provider)
    .bind(&identity.subject)
    .bind(serde_json::json!({"email": identity.email, "name": identity.display_name}))
    .execute(pool)
    .await
    .map_err(|e| format!("DB error linking account: {e}"))?;

    Ok(user_id)
}

/// Push the claims Authelia owns onto an existing row, leaving locally-set values alone when
/// the provider sent nothing — `COALESCE` on the parameter means "only overwrite when the
/// token actually carried a value".
async fn refresh_profile(
    pool: &PgPool,
    user_id: sqlx::types::Uuid,
    identity: &OidcIdentity,
) -> Result<(), String> {
    sqlx::query(
        "UPDATE users SET email = COALESCE($2, email), display_name = COALESCE($3, display_name), updated_at = now() WHERE id = $1",
    )
    .bind(user_id)
    .bind(identity.email.as_deref())
    .bind(identity.display_name.as_deref())
    .execute(pool)
    .await
    .map_err(|e| format!("DB error refreshing profile: {e}"))?;
    Ok(())
}

pub async fn start(
    Query(_q): Query<OidcStartQuery>,
    Extension(store): Extension<Option<Arc<Mutex<SessionStore>>>>,
) -> axum::http::Response<String> {
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
    let redirect = match std::env::var("OIDC_REDIRECT_URI") {
        Ok(v) => v,
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "OIDC_REDIRECT_URI not configured",
            )
        }
    };

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

    let redirect_uri = match RedirectUrl::new(redirect.clone()) {
        Ok(r) => r,
        Err(e) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("invalid OIDC_REDIRECT_URI: {e}"),
            )
        }
    };

    let client = CoreClient::from_provider_metadata(
        provider_metadata,
        ClientId::new(client_id.clone()),
        None,
    )
    .set_redirect_uri(redirect_uri);

    // generate state and nonce
    let mut state_bytes = [0u8; 16];
    rand::rng().fill_bytes(&mut state_bytes);
    let state = URL_SAFE_NO_PAD.encode(state_bytes);
    let mut nonce_bytes = [0u8; 16];
    rand::rng().fill_bytes(&mut nonce_bytes);
    let nonce = URL_SAFE_NO_PAD.encode(nonce_bytes);

    // PKCE (RFC 7636). This is a confidential client, so the secret already binds the code
    // exchange — the challenge closes the remaining window where an intercepted redirect
    // could be replayed before the browser reaches the callback. Authelia is configured with
    // `require_pkce: true`, so the challenge is mandatory, not decorative.
    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

    if let Some(store_arc) = store {
        let mut guard = store_arc.lock().await;
        let _ = guard.store_oidc_state(&state, &nonce, 600).await;
        let _ = guard.store_oidc_pkce(&state, pkce_verifier.secret(), 600).await;
    }

    let auth_req = client
        .authorize_url(
            AuthenticationFlow::<openidconnect::core::CoreResponseType>::AuthorizationCode,
            move || CsrfToken::new(state),
            move || Nonce::new(nonce),
        )
        .set_pkce_challenge(pkce_challenge);
    let (url_val, _, _) = auth_req.url();
    let url = url_val.to_string();
    axum::http::Response::builder()
        .status(StatusCode::FOUND)
        .header(header::LOCATION, url)
        .body(String::new())
        .unwrap_or_default()
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

    let redirect_uri = match RedirectUrl::new(redirect.clone()) {
        Ok(r) => r,
        Err(e) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("invalid OIDC_REDIRECT_URI: {e}"),
            )
        }
    };

    let client = CoreClient::from_provider_metadata(
        provider_metadata,
        ClientId::new(client_id.clone()),
        Some(ClientSecret::new(client_secret.clone())),
    )
    .set_redirect_uri(redirect_uri);

    // Recover the PKCE verifier parked by `start`. Absent means this login did not start
    // here (or the 10-minute window lapsed); the exchange is then attempted without it and
    // the provider rejects it, which is the correct outcome rather than something to paper
    // over locally.
    let pkce_verifier = match (&store, &q.state) {
        (Some(store_arc), Some(state)) => {
            let mut guard = store_arc.lock().await;
            guard.take_oidc_pkce(state).await.ok().flatten()
        }
        _ => None,
    };

    let token_request = match client.exchange_code(AuthorizationCode::new(q.code.clone())) {
        Ok(req) => req,
        Err(e) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("OIDC token request setup failed: {e}"),
            )
        }
    };
    let token_request = match pkce_verifier {
        Some(v) => token_request.set_pkce_verifier(PkceCodeVerifier::new(v)),
        None => token_request,
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

    // Obtain the claims we persist. `preferred_username` is what Authelia sends as the
    // human-readable handle; `name` is the fuller display name, so prefer it when present.
    let subject = claims.as_ref().map(|c| c.subject().to_string()).unwrap_or_default();
    let email = claims.as_ref().and_then(|c| c.email().map(|e| e.to_string()));
    let display_name = claims.as_ref().and_then(|c| {
        c.name()
            .and_then(|n| n.get(None).map(|v| v.to_string()))
            .or_else(|| c.preferred_username().map(|u| u.to_string()))
    });

    if subject.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "missing subject in id token");
    }

    let provider = issuer; // use issuer as provider name
    let identity = OidcIdentity { subject, email, display_name };
    let uid = match provision_oidc_user(&pool, &provider, &identity).await {
        Ok(uid) => uid,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, e),
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
                            return error_response(StatusCode::BAD_REQUEST, "nonce mismatch");
                        }
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
