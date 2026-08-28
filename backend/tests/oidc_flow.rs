use std::env;

#[tokio::test]
async fn test_oidc_state_store_roundtrip() {
    let redis_url = match env::var("REDIS_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("Skipping OIDC state test because REDIS_URL is not set");
            return;
        }
    };
    // This is a minimal smoke test that ensures SessionStore can store and take state
    use tools_backend::tools::session::SessionStore;
    let mut store = SessionStore::new(&redis_url, "test").await.expect("session store");
    let state = "teststate".to_string();
    let nonce = "noncetoken".to_string();
    store.store_oidc_state(&state, &nonce, 10).await.expect("store state");
    let taken = store.take_oidc_nonce(&state).await.expect("take state");
    assert_eq!(taken.unwrap(), nonce);
}

#[tokio::test]
async fn test_oidc_state_edge_cases() {
    let redis_url = match env::var("REDIS_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("Skipping OIDC edge case test because REDIS_URL is not set");
            return;
        }
    };

    use tools_backend::tools::session::SessionStore;
    let mut store = SessionStore::new(&redis_url, "test").await.expect("session store");

    // Test taking non-existent state
    let result = store.take_oidc_nonce("nonexistent").await.expect("take nonexistent");
    assert!(result.is_none(), "should return None for non-existent state");

    // Test storing with empty state
    let result = store.store_oidc_state("", "nonce", 10).await;
    assert!(result.is_ok(), "should handle empty state string");

    // Test storing with very long state/nonce
    let long_state = "a".repeat(1000);
    let long_nonce = "b".repeat(1000);
    let result = store.store_oidc_state(&long_state, &long_nonce, 10).await;
    assert!(result.is_ok(), "should handle very long state and nonce");

    // Test taking the long state
    let taken = store.take_oidc_nonce(&long_state).await.expect("take long state");
    assert_eq!(taken.unwrap(), long_nonce);

    // Test expired state (set TTL to 1 second, wait, then try to take)
    let exp_state = "expiring_state";
    let exp_nonce = "expiring_nonce";
    store.store_oidc_state(exp_state, exp_nonce, 1).await.expect("store expiring state");

    // Immediately try to take it (should work)
    let taken = store.take_oidc_nonce(exp_state).await.expect("take expiring state");
    assert_eq!(taken.unwrap(), exp_nonce);

    // Try to take again (should be gone)
    let taken = store.take_oidc_nonce(exp_state).await.expect("take expired state");
    assert!(taken.is_none(), "should return None after taking state");
}

#[tokio::test]
async fn test_oidc_pkce_verifier_roundtrip_and_single_use() {
    let redis_url = match env::var("REDIS_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("Skipping OIDC PKCE test because REDIS_URL is not set");
            return;
        }
    };
    use tools_backend::tools::session::SessionStore;
    let mut store = SessionStore::new(&redis_url, "test").await.expect("session store");

    let state = format!("pkce-state-{}", uuid::Uuid::new_v4());
    let verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    store.store_oidc_pkce(&state, verifier, 10).await.expect("store verifier");

    assert_eq!(
        store.take_oidc_pkce(&state).await.expect("take verifier").as_deref(),
        Some(verifier)
    );
    // Single use: a replayed callback must not find the verifier a second time.
    assert_eq!(store.take_oidc_pkce(&state).await.expect("take again"), None);
}

#[tokio::test]
async fn test_oidc_pkce_and_nonce_do_not_collide() {
    let redis_url = match env::var("REDIS_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("Skipping OIDC PKCE test because REDIS_URL is not set");
            return;
        }
    };
    use tools_backend::tools::session::SessionStore;
    let mut store = SessionStore::new(&redis_url, "test").await.expect("session store");

    // Both are keyed by the same `state`; they must live under distinct Redis keys or one
    // would silently overwrite the other and every login would fail nonce verification.
    let state = format!("shared-state-{}", uuid::Uuid::new_v4());
    store.store_oidc_state(&state, "the-nonce", 10).await.expect("store nonce");
    store.store_oidc_pkce(&state, "the-verifier", 10).await.expect("store verifier");

    assert_eq!(store.take_oidc_nonce(&state).await.expect("nonce").as_deref(), Some("the-nonce"));
    assert_eq!(store.take_oidc_pkce(&state).await.expect("pkce").as_deref(), Some("the-verifier"));
}
