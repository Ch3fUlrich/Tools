use axum::extract::Extension;
use axum::extract::Json;
use axum::http::HeaderMap;
use axum::response::IntoResponse;
use serde_json::json;

#[tokio::test]
async fn test_verify_password_roundtrip() {
    // Create a password hash using the same Argon2 logic used in the app
    use argon2::{password_hash::SaltString, Argon2, PasswordHasher};
    use rand_core::OsRng;

    let password = "correcthorsebatterystaple";
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .expect("hash failed")
        .to_string();

    // Call the verify helper from the tools
    let ok = tools_backend::tools::auth::verify_password(&hash, password).await;
    assert!(ok.is_ok());
    assert!(ok.unwrap());

    // Wrong password should not verify
    let bad = tools_backend::tools::auth::verify_password(&hash, "wrongpassword").await;
    assert!(bad.is_ok());
    assert!(!bad.unwrap());
}

#[test]
fn test_parse_sid_from_cookie() {
    let cookie = "other=1; sid=abc-123-xyz; foo=bar";
    let sid = tools_backend::tools::session::SessionStore::parse_sid_from_cookie(cookie);
    assert_eq!(sid, Some("abc-123-xyz".to_string()));

    let none = tools_backend::tools::session::SessionStore::parse_sid_from_cookie("no-sid-here=1");
    assert!(none.is_none());
}

#[tokio::test]
async fn test_dice_roll_handler_without_store() {
    // Call the dice handler directly with no Extension (no redis/session store)
    use tools_backend::api::dice::roll;

    let payload = json!({
        "die": { "type": "d6" },
        "count": 2,
        "rolls": 1
    });

    let headers = HeaderMap::new();
    let response = roll(
        Extension(
            None::<std::sync::Arc<tokio::sync::Mutex<tools_backend::tools::session::SessionStore>>>,
        ),
        headers,
        Json(payload),
    )
    .await
    .into_response();

    // Expect OK or BAD_REQUEST depending on payload deserialization — with this payload it should be OK
    let status = response.status();
    assert!(status.is_success(), "status was: {}", status);
}
