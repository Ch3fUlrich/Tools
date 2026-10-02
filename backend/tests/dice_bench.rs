use axum::{routing::post, Extension, Router};
use axum_test::TestServer;
use serde_json::json;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Mutex as AsyncMutex;
use tools_backend::api::dice::roll;
use tools_backend::tools::session::SessionStore;

#[tokio::test]
async fn test_dice_batch_perf() {
    let app = Router::new()
        .route("/roll", post(roll))
        .layer(Extension(None::<Arc<AsyncMutex<SessionStore>>>));

    let server = TestServer::new(app);

    let mut reqs = Vec::new();
    for _ in 0..100 {
        reqs.push(json!({
            "die": { "type": "d20" },
            "count": 10,
            "rolls": 50
        }));
    }

    let payload = json!(reqs);

    let start = Instant::now();
    let res = server.post("/roll").json(&payload).await;
    let elapsed = start.elapsed();

    assert_eq!(res.status_code(), 200, "Response: {:?}", res.text());
    println!("Elapsed for batch of 100 requests: {:?}", elapsed);
}
