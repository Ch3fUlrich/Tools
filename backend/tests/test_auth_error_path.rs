use axum_test::TestServer;
use serde_json::json;
use sqlx::{postgres::PgPoolOptions, Executor, Row};
use std::env;
use std::sync::Arc;

#[tokio::test]
async fn test_login_missing_id_error() {
    let db_url = match env::var("TEST_DATABASE_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("TEST_DATABASE_URL not set");
            return;
        }
    };

    let schema_name = format!("test_schema_{}", uuid::Uuid::new_v4().to_string().replace('-', ""));
    let email = format!("test_err+{}@example.com", uuid::Uuid::new_v4());

    let setup_pool = sqlx::PgPool::connect(&db_url).await.expect("connect");

    // Make sure public table is available for register
    setup_pool.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto").await.unwrap();
    setup_pool
        .execute(
            r#"
        CREATE TABLE IF NOT EXISTS users (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            email text UNIQUE NOT NULL,
            password_hash text NOT NULL,
            display_name text,
            created_at timestamptz DEFAULT now()
        )
    "#,
        )
        .await
        .unwrap();

    let _ =
        tools_backend::tools::auth::register_user(&setup_pool, &email, "password123", None).await;
    let rec = sqlx::query("SELECT password_hash FROM users WHERE email = $1")
        .bind(&email)
        .fetch_one(&setup_pool)
        .await
        .unwrap();
    let hash: String = rec.try_get("password_hash").unwrap();

    setup_pool.execute(&*format!("CREATE SCHEMA {}", schema_name)).await.unwrap();
    setup_pool
        .execute(&*format!(
            "CREATE TABLE {}.users (id text, password_hash text, email text)",
            schema_name
        ))
        .await
        .unwrap();
    sqlx::query(&format!(
        "INSERT INTO {}.users (id, password_hash, email) VALUES ('not-a-uuid', $1, $2)",
        schema_name
    ))
    .bind(&hash)
    .bind(&email)
    .execute(&setup_pool)
    .await
    .unwrap();

    let pool = PgPoolOptions::new()
        .after_connect({
            let schema = schema_name.clone();
            move |conn, _meta| {
                let schema = schema.clone();
                Box::pin(async move {
                    conn.execute(&*format!("SET search_path TO {}", schema)).await?;
                    Ok(())
                })
            }
        })
        .connect(&db_url)
        .await
        .expect("pool with custom search path");

    let pool = Arc::new(pool);
    let app = tools_backend::app::build_app(pool, None);
    let server = TestServer::new(app);

    let resp = server
        .post("/api/auth/login")
        .json(&json!({
            "email": email,
            "password": "password123"
        }))
        .await;

    assert_eq!(resp.status_code(), 500);
    let resp_json: serde_json::Value = resp.json();
    assert_eq!(resp_json["error"], "internal");

    setup_pool.execute(&*format!("DROP SCHEMA {} CASCADE", schema_name)).await.unwrap();
}
