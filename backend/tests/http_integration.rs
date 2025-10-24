use std::env;
use std::sync::Arc;
use sqlx::PgPool;
use axum_test::TestServer;

#[tokio::test]
async fn test_http_endpoints() {
    let db_url = match env::var("TEST_DATABASE_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("TEST_DATABASE_URL not set — skipping HTTP integration test");
            return;
        }
    };

    let redis_url = env::var("REDIS_URL").ok();

    let pool = PgPool::connect(&db_url).await.expect("connect db");
    // Ensure migrations/tables exist (same as earlier test)
    let _ = sqlx::query("CREATE EXTENSION IF NOT EXISTS pgcrypto;").execute(&pool).await;
    let _ = sqlx::query("CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE NOT NULL);").execute(&pool).await;
    let _ = sqlx::query("CREATE TABLE IF NOT EXISTS dice_rolls (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id) ON DELETE SET NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());").execute(&pool).await;

    let pool = Arc::new(pool);

    let session_store = if let Some(url) = redis_url.clone() {
        let s = tools_backend::tools::session::SessionStore::new(&url, "tools").await.expect("create store");
        Some(Arc::new(tokio::sync::Mutex::new(s)))
    } else {
        None
    };

    let app = tools_backend::app::build_app(pool.clone(), session_store);

    let server = TestServer::new(app).unwrap();

    // 1) Test root
    let resp = server.get("/").await;
    assert!(resp.status_code().is_success());

    // 2) Test dice roll
    let body = r#"{"die":{"type":"d6"},"count":2,"rolls":1}"#;
    let resp = server.post("/api/tools/dice/roll").json(&serde_json::from_str::<serde_json::Value>(body).unwrap()).await;
    assert!(resp.status_code().is_success());

    // 3) Save a roll (anonymous -> DB fallback)
    let body = r#"{"payload":{"http_test":true}}"#;
    let resp = server.post("/api/tools/dice/save").json(&serde_json::from_str::<serde_json::Value>(body).unwrap()).await;
    assert!(resp.status_code().is_success());
}

#[tokio::test]
async fn test_http_error_responses() {
    let db_url = match env::var("TEST_DATABASE_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("TEST_DATABASE_URL not set — skipping HTTP error test");
            return;
        }
    };

    let redis_url = env::var("REDIS_URL").ok();
    let pool = PgPool::connect(&db_url).await.expect("connect db");
    let pool = Arc::new(pool);

    let session_store = if let Some(url) = redis_url.clone() {
        let s = tools_backend::tools::session::SessionStore::new(&url, "tools").await.expect("create store");
        Some(Arc::new(tokio::sync::Mutex::new(s)))
    } else {
        None
    };

    let app = tools_backend::app::build_app(pool.clone(), session_store);
    let server = TestServer::new(app).unwrap();

    // Test invalid JSON - should be 400 Bad Request, but axum might return 415 for wrong content type
    let resp = server.post("/api/tools/fat-loss").text("invalid json").await;
    assert!(resp.status_code().is_client_error(), "Should return client error for invalid content");

    // Test invalid dice request (negative count)
    let body = r#"{"die":{"type":"d6"},"count":-1,"rolls":1}"#;
    let resp = server.post("/api/tools/dice/roll").json(&serde_json::from_str::<serde_json::Value>(body).unwrap()).await;
    assert_eq!(resp.status_code(), 400);

    // Test invalid dice request (too many dice)
    let body = r#"{"die":{"type":"d6"},"count":1000,"rolls":1}"#;
    let resp = server.post("/api/tools/dice/roll").json(&serde_json::from_str::<serde_json::Value>(body).unwrap()).await;
    assert_eq!(resp.status_code(), 400);

    // Test nonexistent endpoint
    let resp = server.get("/api/nonexistent").await;
    assert_eq!(resp.status_code(), 404);

    // Test wrong method
    let resp = server.get("/api/tools/dice/roll").await;
    assert_eq!(resp.status_code(), 405);
}

#[tokio::test]
async fn test_fat_loss_api_validation() {
    let db_url = match env::var("TEST_DATABASE_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("TEST_DATABASE_URL not set — skipping fat loss validation test");
            return;
        }
    };

    let redis_url = env::var("REDIS_URL").ok();
    let pool = PgPool::connect(&db_url).await.expect("connect db");
    let pool = Arc::new(pool);

    let session_store = if let Some(url) = redis_url.clone() {
        let s = tools_backend::tools::session::SessionStore::new(&url, "tools").await.expect("create store");
        Some(Arc::new(tokio::sync::Mutex::new(s)))
    } else {
        None
    };

    let app = tools_backend::app::build_app(pool.clone(), session_store);
    let server = TestServer::new(app).unwrap();

    // Test valid fat loss calculation (calculate percentage from deficit and weight loss)
    let body = r#"{"kcal_deficit":3500.0,"weight_loss_kg":0.5}"#;
    let resp = server.post("/api/tools/fat-loss").json(&serde_json::from_str::<serde_json::Value>(body).unwrap()).await;
    assert_eq!(resp.status_code(), 200);

    // Test invalid inputs (zero values)
    let body = r#"{"kcal_deficit":0.0,"weight_loss_kg":0.5}"#;
    let resp = server.post("/api/tools/fat-loss").json(&serde_json::from_str::<serde_json::Value>(body).unwrap()).await;
    assert_eq!(resp.status_code(), 400);

    // Test invalid inputs (negative values)
    let body = r#"{"kcal_deficit":3500.0,"weight_loss_kg":-0.5}"#;
    let resp = server.post("/api/tools/fat-loss").json(&serde_json::from_str::<serde_json::Value>(body).unwrap()).await;
    assert_eq!(resp.status_code(), 400);

    // Test invalid inputs (impossible scenario - too much deficit for weight loss)
    let body = r#"{"kcal_deficit":10000.0,"weight_loss_kg":0.5}"#;
    let resp = server.post("/api/tools/fat-loss").json(&serde_json::from_str::<serde_json::Value>(body).unwrap()).await;
    assert_eq!(resp.status_code(), 400);
}
