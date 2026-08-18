use axum_test::TestServer;
use sqlx::PgPool;
use std::env;
use std::sync::Arc;
use tools_backend::tools::auth as auth_tools;

async fn setup_test_server() -> Option<(TestServer, String, String)> {
    let db_url = match env::var("TEST_DATABASE_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("TEST_DATABASE_URL not set — skipping training integration test");
            return None;
        }
    };

    let redis_url = env::var("REDIS_URL").ok()?;

    let pool = PgPool::connect(&db_url).await.expect("connect db");

    // Run migrations using sqlx
    sqlx::migrate!("./migrations").run(&pool).await.unwrap_or_else(|e| {
        let msg = e.to_string();
        if msg.contains("duplicate key value") || msg.contains("_sqlx_migrations_pkey") {
            eprintln!("Notice: migrations appear already applied. Treating as success.");
        } else {
            panic!("Migration failed: {}", e);
        }
    });

    let pool = Arc::new(pool);

    let session_store = {
        let s = tools_backend::tools::session::SessionStore::new(&redis_url, "tools_test")
            .await
            .expect("create store");
        Arc::new(tokio::sync::Mutex::new(s))
    };

    let app = tools_backend::app::build_app(pool.clone(), Some(session_store.clone()));
    let server = TestServer::new(app);

    // Register a user
    let email = format!("training_test_{}@example.com", uuid::Uuid::new_v4());
    let password = "password123";
    let user_id = auth_tools::register_user(&pool, &email, password, Some("Training Tester"))
        .await
        .expect("register user");

    // Create session
    let sid = {
        let mut store_guard = session_store.lock().await;
        store_guard.create_session(user_id, 3600).await.expect("create session")
    };

    // Format cookie
    let cookie_str = format!("sid={sid}; HttpOnly; Path=/");

    Some((server, cookie_str, user_id.to_string()))
}

#[tokio::test]
async fn test_training_measurements_crud() {
    let (server, cookie_str, _) = match setup_test_server().await {
        Some(s) => s,
        None => return,
    };

    // 1. Create a measurement
    let body = serde_json::json!({
        "bodyWeightKg": 80.5,
        "heightCm": 180.0,
        "shoulderWidthCm": 45.5
    });

    let resp = server
        .post("/api/tools/training/measurements")
        .add_header("Cookie", &cookie_str)
        .json(&body)
        .await;

    assert!(resp.status_code().is_success(), "Create measurement failed: {}", resp.text());

    let resp_json: serde_json::Value = resp.json();
    let id =
        resp_json.get("id").expect("Missing id").as_str().expect("id is not a string").to_string();
    assert!(!id.is_empty());

    // 2. Try creating with invalid data (negative weight)
    let invalid_body = serde_json::json!({
        "bodyWeightKg": -10.0
    });

    let resp_invalid = server
        .post("/api/tools/training/measurements")
        .add_header("Cookie", &cookie_str)
        .json(&invalid_body)
        .await;

    assert_eq!(resp_invalid.status_code(), 400, "Should reject negative weight");

    // 3. List measurements
    let resp_list =
        server.get("/api/tools/training/measurements").add_header("Cookie", &cookie_str).await;

    assert!(resp_list.status_code().is_success(), "List measurements failed");

    let list_json: serde_json::Value = resp_list.json();
    let data = list_json
        .get("measurements")
        .expect("Missing object")
        .as_array()
        .expect("data is not an array");
    assert_eq!(data.len(), 1, "Should have exactly 1 measurement");

    let first_item = &data[0];
    assert_eq!(first_item.get("id").unwrap().as_str().unwrap(), id);
    assert_eq!(first_item.get("bodyWeightKg").unwrap().as_str().unwrap().parse::<f64>().unwrap(), 80.5);
    assert_eq!(first_item.get("heightCm").unwrap().as_str().unwrap().parse::<f64>().unwrap(), 180.0);

    // 4. Get latest measurement
    let resp_latest = server
        .get("/api/tools/training/measurements/latest")
        .add_header("Cookie", &cookie_str)
        .await;

    assert!(resp_latest.status_code().is_success(), "Get latest measurement failed");

    let latest_json: serde_json::Value = resp_latest.json();
    let latest_data = latest_json.as_object().expect("Missing object");
    assert_eq!(latest_data.get("id").unwrap().as_str().unwrap(), id);
    assert_eq!(latest_data.get("bodyWeightKg").unwrap().as_str().unwrap().parse::<f64>().unwrap(), 80.5);

    // 5. Delete measurement
    let delete_url = format!("/api/tools/training/measurements/{}", id);
    let resp_delete = server.delete(&delete_url).add_header("Cookie", &cookie_str).await;

    assert!(resp_delete.status_code().is_success(), "Delete measurement failed");

    // 6. Verify deletion (list should be empty)
    let resp_list_after =
        server.get("/api/tools/training/measurements").add_header("Cookie", &cookie_str).await;

    assert!(resp_list_after.status_code().is_success());
    let list_json_after: serde_json::Value = resp_list_after.json();
    let data_after = list_json_after.get("measurements").unwrap().as_array().unwrap();
    assert_eq!(data_after.len(), 0, "List should be empty after deletion");

    // 7. Verify deletion (latest should be empty)
    let resp_latest_after = server
        .get("/api/tools/training/measurements/latest")
        .add_header("Cookie", &cookie_str)
        .await;

    assert_eq!(resp_latest_after.status_code(), 404);
    let latest_json_after: serde_json::Value = resp_latest_after.json();
    assert!(latest_json_after.get("error").is_some(), "Latest should be null after deletion");

    // 8. Try deleting already deleted measurement
    let resp_delete_again = server.delete(&delete_url).add_header("Cookie", &cookie_str).await;

    assert_eq!(
        resp_delete_again.status_code(),
        404,
        "Should return 404 when deleting non-existent measurement"
    );
}

#[tokio::test]
async fn test_training_plans_crud() {
    let (server, cookie_str, _) = match setup_test_server().await {
        Some(s) => s,
        None => return,
    };

    // 1. Create a plan
    let body = serde_json::json!({
        "name": "Integration Test Plan",
        "description": "A plan created during testing",
        "planType": "full_body",
        "isActive": true,
        "sortOrder": 1
    });

    let resp = server
        .post("/api/tools/training/plans")
        .add_header("Cookie", &cookie_str)
        .json(&body)
        .await;

    assert!(resp.status_code().is_success(), "Create plan failed: {}", resp.text());

    let resp_json: serde_json::Value = resp.json();
    let id =
        resp_json.get("id").expect("Missing id").as_str().expect("id is not a string").to_string();
    assert!(!id.is_empty());

    // 2. List plans
    let resp_list = server.get("/api/tools/training/plans").add_header("Cookie", &cookie_str).await;

    assert!(resp_list.status_code().is_success(), "List plans failed");

    let list_json: serde_json::Value = resp_list.json();
    let data =
        list_json.get("plans").expect("Missing object").as_array().expect("data is not an array");
    assert_eq!(data.len(), 1, "Should have exactly 1 plan");

    let first_item = &data[0];
    assert_eq!(first_item.get("id").unwrap().as_str().unwrap(), id);
    assert_eq!(first_item.get("name").unwrap().as_str().unwrap(), "Integration Test Plan");

    // 3. Get specific plan
    let get_url = format!("/api/tools/training/plans/{}", id);
    let resp_get = server.get(&get_url).add_header("Cookie", &cookie_str).await;

    assert!(resp_get.status_code().is_success(), "Get plan failed");

    let get_json: serde_json::Value = resp_get.json();
    let plan_data = get_json.as_object().expect("Missing object");
    assert_eq!(plan_data.get("id").unwrap().as_str().unwrap(), id);
    assert_eq!(plan_data.get("name").unwrap().as_str().unwrap(), "Integration Test Plan");

    // 4. Delete plan
    let resp_delete = server.delete(&get_url).add_header("Cookie", &cookie_str).await;

    assert!(resp_delete.status_code().is_success(), "Delete plan failed");
}

#[tokio::test]
async fn test_training_sessions_crud() {
    let (server, cookie_str, _) = match setup_test_server().await {
        Some(s) => s,
        None => return,
    };

    // 1. Create a session
    let body = serde_json::json!({
        "name": "Morning Workout",
        "notes": "Felt good"
    });

    let resp = server
        .post("/api/tools/training/sessions")
        .add_header("Cookie", &cookie_str)
        .json(&body)
        .await;

    assert!(resp.status_code().is_success(), "Create session failed: {}", resp.text());

    let resp_json: serde_json::Value = resp.json();
    let id =
        resp_json.get("id").expect("Missing id").as_str().expect("id is not a string").to_string();
    assert!(!id.is_empty());

    // 2. List sessions
    let resp_list =
        server.get("/api/tools/training/sessions").add_header("Cookie", &cookie_str).await;

    assert!(resp_list.status_code().is_success(), "List sessions failed");

    let list_json: serde_json::Value = resp_list.json();
    let data = list_json
        .get("sessions")
        .expect("Missing object")
        .as_array()
        .expect("data is not an array");
    assert_eq!(data.len(), 1, "Should have exactly 1 session");

    let first_item = &data[0];
    assert_eq!(first_item.get("id").unwrap().as_str().unwrap(), id);
    assert_eq!(first_item.get("name").unwrap().as_str().unwrap(), "Morning Workout");
}
