//! End-to-end checks for the saved Elterngeld scenarios.
//!
//! The property worth testing here is not "a row round-trips" but "a row round-trips *to its
//! owner only*" — the tool holds someone's income and tax figures, so a leak between accounts
//! is the failure that matters. Requires TEST_DATABASE_URL and REDIS_URL; skips otherwise.

use axum_test::TestServer;
use sqlx::PgPool;
use std::env;
use std::sync::Arc;
use tools_backend::tools::auth as auth_tools;
use tools_backend::tools::session::SessionStore;

struct Harness {
    server: TestServer,
    /// Cookie header for two separate accounts, so isolation can actually be exercised.
    alice: String,
    bob: String,
}

async fn setup() -> Option<Harness> {
    let db_url = env::var("TEST_DATABASE_URL").ok().or_else(|| {
        eprintln!("TEST_DATABASE_URL not set — skipping elterngeld integration test");
        None
    })?;
    let redis_url = env::var("REDIS_URL").ok()?;

    let pool = PgPool::connect(&db_url).await.expect("connect db");
    sqlx::migrate!("./migrations").run(&pool).await.unwrap_or_else(|e| {
        let msg = e.to_string();
        if msg.contains("duplicate key value") || msg.contains("_sqlx_migrations_pkey") {
            eprintln!("Notice: migrations appear already applied. Treating as success.");
        } else {
            panic!("Migration failed: {e}");
        }
    });
    let pool = Arc::new(pool);

    let store = Arc::new(tokio::sync::Mutex::new(
        SessionStore::new(&redis_url, "tools_test").await.expect("create store"),
    ));
    let server = TestServer::new(tools_backend::app::build_app(pool.clone(), Some(store.clone())));

    let mut cookies = Vec::new();
    for who in ["alice", "bob"] {
        let email = format!("elterngeld_{who}_{}@example.com", uuid::Uuid::new_v4());
        let uid = auth_tools::register_user(&pool, &email, "password123", Some(who))
            .await
            .expect("register user");
        let sid = store.lock().await.create_session(uid, 3600).await.expect("create session");
        cookies.push(format!("sid={sid}; HttpOnly; Path=/"));
    }

    Some(Harness { server, alice: cookies.remove(0), bob: cookies.remove(0) })
}

fn payload(profit: u32) -> serde_json::Value {
    serde_json::json!({ "version": 1, "filing": "married", "profitLow": profit.to_string() })
}

#[tokio::test]
async fn scenarios_round_trip_and_overwrite_by_name() {
    let Some(h) = setup().await else { return };
    let name = format!("Base {}", uuid::Uuid::new_v4());

    let created = h
        .server
        .post("/api/tools/elterngeld/inputs")
        .add_header("cookie", &h.alice)
        .json(&serde_json::json!({ "name": name, "payload": payload(30_000) }))
        .await;
    assert_eq!(created.status_code(), 201, "first save creates");

    // Saving the same name again is an edit, not a duplicate.
    let updated = h
        .server
        .post("/api/tools/elterngeld/inputs")
        .add_header("cookie", &h.alice)
        .json(&serde_json::json!({ "name": name, "payload": payload(45_000) }))
        .await;
    assert_eq!(updated.status_code(), 200, "second save updates");

    let listed: serde_json::Value = h
        .server
        .get("/api/tools/elterngeld/inputs")
        .add_header("cookie", &h.alice)
        .await
        .json();
    let mine: Vec<_> = listed["scenarios"]
        .as_array()
        .expect("scenarios array")
        .iter()
        .filter(|s| s["name"] == serde_json::json!(name))
        .collect();
    assert_eq!(mine.len(), 1, "overwrite must not leave two rows with the same name");
    assert_eq!(mine[0]["payload"]["profitLow"], serde_json::json!("45000"));

    let id = mine[0]["id"].as_str().expect("id").to_string();
    let deleted = h
        .server
        .delete(&format!("/api/tools/elterngeld/inputs/{id}"))
        .add_header("cookie", &h.alice)
        .await;
    assert_eq!(deleted.status_code(), 200);
}

#[tokio::test]
async fn one_user_can_neither_see_nor_delete_anothers_scenario() {
    let Some(h) = setup().await else { return };
    let name = format!("Alice private {}", uuid::Uuid::new_v4());

    let created: serde_json::Value = h
        .server
        .post("/api/tools/elterngeld/inputs")
        .add_header("cookie", &h.alice)
        .json(&serde_json::json!({ "name": name, "payload": payload(99_000) }))
        .await
        .json();
    let id = created["id"].as_str().expect("id").to_string();

    let bobs: serde_json::Value =
        h.server.get("/api/tools/elterngeld/inputs").add_header("cookie", &h.bob).await.json();
    let leaked = bobs["scenarios"]
        .as_array()
        .expect("scenarios array")
        .iter()
        .any(|s| s["name"] == serde_json::json!(name));
    assert!(!leaked, "bob must not see alice's saved scenario");

    // Knowing the id must not be enough: the DELETE is scoped by user_id as well.
    let attempt = h
        .server
        .delete(&format!("/api/tools/elterngeld/inputs/{id}"))
        .add_header("cookie", &h.bob)
        .await;
    assert_eq!(attempt.status_code(), 404, "bob must not delete alice's scenario");

    let still_there: serde_json::Value =
        h.server.get("/api/tools/elterngeld/inputs").add_header("cookie", &h.alice).await.json();
    assert!(
        still_there["scenarios"]
            .as_array()
            .expect("scenarios array")
            .iter()
            .any(|s| s["name"] == serde_json::json!(name)),
        "alice's scenario must survive bob's delete attempt"
    );
}

#[tokio::test]
async fn saving_without_a_session_is_rejected() {
    let Some(h) = setup().await else { return };

    let anon = h
        .server
        .post("/api/tools/elterngeld/inputs")
        .json(&serde_json::json!({ "name": "anon", "payload": payload(1) }))
        .await;
    assert_eq!(anon.status_code(), 401);

    let anon_list = h.server.get("/api/tools/elterngeld/inputs").await;
    assert_eq!(anon_list.status_code(), 401);
}

#[tokio::test]
async fn a_blank_name_is_a_client_error_not_a_silent_save() {
    let Some(h) = setup().await else { return };

    let resp = h
        .server
        .post("/api/tools/elterngeld/inputs")
        .add_header("cookie", &h.alice)
        .json(&serde_json::json!({ "name": "   ", "payload": payload(1) }))
        .await;
    assert_eq!(resp.status_code(), 400);
}
