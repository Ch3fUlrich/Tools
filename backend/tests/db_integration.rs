use std::env;

use sqlx::{PgPool, Row};
use redis::AsyncCommands;

#[tokio::test]
async fn test_postgres_and_redis_integration() {
    // These integration tests require a running Postgres and Redis instance.
    let db_url = match env::var("TEST_DATABASE_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("TEST_DATABASE_URL not set — skipping Postgres integration test");
            return;
        }
    };

    let redis_url = match env::var("REDIS_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("REDIS_URL not set — skipping Redis portion of integration test");
            // we'll still run Postgres part
            String::new()
        }
    };

    // Connect to Postgres
    let pool = PgPool::connect(&db_url).await.expect("Failed to connect to Postgres");

    // Ensure minimal tables exist (idempotent)
    let _ = sqlx::query(
        r#"CREATE EXTENSION IF NOT EXISTS pgcrypto;"#
    ).execute(&pool).await;

    let _ = sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            display_name TEXT
        );"#
    ).execute(&pool).await.expect("create users failed");

    let _ = sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS dice_rolls (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid REFERENCES users(id) ON DELETE SET NULL,
            payload jsonb NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        );"#
    ).execute(&pool).await.expect("create dice_rolls failed");

    // Insert a user
    let email = format!("test+{}@example.com", uuid::Uuid::new_v4());
    let inserted = sqlx::query("INSERT INTO users (email, password_hash) VALUES ($1, '') RETURNING id::text")
        .bind(&email)
        .fetch_one(&pool)
        .await
        .expect("insert user failed");
    let user_id: String = inserted.try_get("id").unwrap();

    // Insert a dice roll associated with user
    let payload = serde_json::json!({"test":"payload"});
    let inserted_roll = sqlx::query("INSERT INTO dice_rolls (user_id, payload) VALUES ($1, $2) RETURNING id::text")
        .bind(user_id.parse::<uuid::Uuid>().ok())
        .bind(payload)
        .fetch_one(&pool)
        .await
        .expect("insert dice_roll failed");
    let roll_id: String = inserted_roll.try_get("id").unwrap();
    assert!(!roll_id.is_empty());

    // Query back
    let row = sqlx::query("SELECT count(*) as c FROM dice_rolls")
        .fetch_one(&pool)
        .await
        .expect("count query failed");
    let count: i64 = row.try_get("c").unwrap_or(0);
    assert!(count >= 1, "expected at least one dice_rolls row");

    // If REDIS_URL present, test Redis list operations
    if !redis_url.is_empty() {
        let client = redis::Client::open(redis_url.as_str()).expect("Failed to create redis client");
        let mut conn = client.get_async_connection().await.expect("Failed to connect to redis");

        let key = format!("test:history:{}", uuid::Uuid::new_v4());
        let _: () = conn.lpush(&key, "payload1").await.expect("lpush failed");
        let vals: Vec<String> = conn.lrange(&key, 0, -1).await.expect("lrange failed");
        assert_eq!(vals.len(), 1);
        assert_eq!(vals[0], "payload1");
        let _: i64 = conn.del(&key).await.expect("del failed");
    }
}

#[tokio::test]
async fn test_database_connection_failures() {
    // Test invalid database URL
    let invalid_url = "postgresql://invalid:invalid@invalid:5432/invalid";
    let result = PgPool::connect(invalid_url).await;
    assert!(result.is_err(), "Should fail to connect to invalid database URL");

    // Test with valid URL but invalid credentials (if we can construct one)
    // This is harder to test reliably, but we can test the error handling
}

#[tokio::test]
async fn test_database_query_error_handling() {
    let db_url = match env::var("TEST_DATABASE_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("TEST_DATABASE_URL not set — skipping database error test");
            return;
        }
    };

    let pool = PgPool::connect(&db_url).await.expect("Failed to connect to Postgres");

    // Test invalid SQL syntax
    let result = sqlx::query("INVALID SQL SYNTAX").execute(&pool).await;
    assert!(result.is_err(), "Should fail with invalid SQL");

    // Test query on non-existent table
    let result = sqlx::query("SELECT * FROM nonexistent_table").execute(&pool).await;
    assert!(result.is_err(), "Should fail when querying non-existent table");

    // Test constraint violation (if we can trigger one)
    // First ensure we have a table with constraints
    let _ = sqlx::query("CREATE TABLE IF NOT EXISTS test_constraints (id SERIAL PRIMARY KEY, email TEXT UNIQUE)").execute(&pool).await;

    // Insert first record
    let _ = sqlx::query("INSERT INTO test_constraints (email) VALUES ($1)").bind("test@example.com").execute(&pool).await;

    // Try to insert duplicate email (should fail due to unique constraint)
    let result = sqlx::query("INSERT INTO test_constraints (email) VALUES ($1)").bind("test@example.com").execute(&pool).await;
    assert!(result.is_err(), "Should fail due to unique constraint violation");

    // Clean up
    let _ = sqlx::query("DROP TABLE test_constraints").execute(&pool).await;
}
