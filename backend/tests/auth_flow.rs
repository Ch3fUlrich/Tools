use sqlx::Executor;
use sqlx::Row;
use std::env;
use tools_backend::tools::auth as auth_tools;
use tools_backend::tools::session::SessionStore;

#[tokio::test]
async fn test_register_and_save_history() {
    let database_url = match env::var("TEST_DATABASE_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("TEST_DATABASE_URL not set — skipping DB integration test");
            return;
        }
    };

    let pool = sqlx::PgPool::connect(&database_url)
        .await
        .expect("connect test db");

    // prepare schema for tests
    let _ = pool
        .execute(
            r#"
        DROP TABLE IF EXISTS dice_rolls;
        DROP TABLE IF EXISTS users;
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
        CREATE TABLE users (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            email text UNIQUE NOT NULL,
            password_hash text NOT NULL,
            display_name text,
            created_at timestamptz DEFAULT now()
        );
        CREATE TABLE dice_rolls (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid REFERENCES users(id) ON DELETE SET NULL,
            session_id text NULL,
            payload jsonb NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        );
    "#,
        )
        .await;

    // Register a user via tools::auth::register_user
    let email = format!("test+{}@example.com", uuid::Uuid::new_v4());
    let password = "password123";
    let id = auth_tools::register_user(&pool, &email, password, Some("Tester"))
        .await
        .expect("register");

    // Save a dice history entry directly via SQL (simulate endpoint)
    let payload = serde_json::json!({"rolls": [{"sum": 10}], "summary": {}});
    let rec =
        sqlx::query("INSERT INTO dice_rolls (user_id, payload) VALUES ($1, $2) RETURNING id::text")
            .bind(id)
            .bind(payload)
            .fetch_one(&pool)
            .await
            .expect("insert history");
    let rid: String = rec.try_get("id").expect("id present");
    assert!(!rid.is_empty());

    // Query back
    let rows = sqlx::query("SELECT id::text as id, payload FROM dice_rolls WHERE user_id = $1")
        .bind(id)
        .fetch_all(&pool)
        .await
        .expect("select");
    assert!(!rows.is_empty());
}

#[tokio::test]
async fn test_session_store_redis() {
    let redis_url = match env::var("REDIS_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("REDIS_URL not set — skipping Redis session store test");
            return;
        }
    };

    let mut store = SessionStore::new(&redis_url, "test")
        .await
        .expect("create store");
    let uid = uuid::Uuid::new_v4();
    let sid = store.create_session(uid, 60).await.expect("create sid");
    let got = store.get_session(&sid).await.expect("get session");
    assert!(got.is_some());
    store.destroy_session(&sid).await.expect("destroy");
    let got2 = store.get_session(&sid).await.expect("get session2");
    assert!(got2.is_none());
}

#[tokio::test]
async fn test_register_user_validation() {
    let database_url = match env::var("TEST_DATABASE_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("TEST_DATABASE_URL not set — skipping auth validation test");
            return;
        }
    };

    let pool = sqlx::PgPool::connect(&database_url)
        .await
        .expect("connect test db");

    // Test invalid email (empty)
    let result = auth_tools::register_user(&pool, "", "password123", Some("Test")).await;
    assert!(result.is_err(), "Should reject empty email");

    // Test invalid password (empty)
    let result = auth_tools::register_user(&pool, "test@example.com", "", Some("Test")).await;
    assert!(result.is_err(), "Should reject empty password");

    // Test duplicate email registration
    let email = format!("duplicate+{}@example.com", uuid::Uuid::new_v4());
    let _ = auth_tools::register_user(&pool, &email, "password123", Some("Test"))
        .await
        .expect("first registration should succeed");

    // Second registration with same email should fail (assuming unique constraint)
    let result =
        auth_tools::register_user(&pool, &email, "different_password", Some("Test2")).await;
    assert!(result.is_err(), "Should reject duplicate email");
}

#[tokio::test]
async fn test_session_store_edge_cases() {
    let redis_url = match env::var("REDIS_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("REDIS_URL not set — skipping session edge case test");
            return;
        }
    };

    let mut store = SessionStore::new(&redis_url, "test")
        .await
        .expect("create session store");

    // Test with empty session ID
    let result = store.get_session("").await;
    assert!(result.is_err() || result.unwrap().is_none(), "Empty session ID should not work");

    // Test with very long session ID - create a session and try to get it
    let test_uuid = uuid::Uuid::new_v4();
    let sid = store
        .create_session(test_uuid, 300)
        .await
        .expect("create session");
    let result = store.get_session(&sid).await;
    assert!(result.is_ok(), "Should handle session retrieval");
    assert!(result.unwrap().is_some(), "Session should exist");

    // Clean up
    let _ = store.destroy_session(&sid).await;
}
