use std::env;

#[tokio::test]
async fn test_sliding_window_limiter() {
    let redis_url = match env::var("REDIS_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("Skipping limiter test because REDIS_URL is not set");
            return;
        }
    };
    use tools_backend::tools::session::SessionStore;
    let mut store = SessionStore::new(&redis_url, "testlim")
        .await
        .expect("session store");
    let key = "testlim:lim:key";
    // nuke key using a per-call multiplexed connection
    // DEL returns number of keys removed; use i64 to satisfy FromRedisValue bound
    let mut conn = store.get_conn().await.expect("redis conn");
    let _: i64 = redis::cmd("DEL")
        .arg(key)
        .query_async(&mut conn)
        .await
        .unwrap();
    // allow up to 3 in 2 seconds
    for i in 0..3 {
        let ok = store.allow_sliding_window(key, 2, 3).await.expect("allow");
        assert!(ok, "should allow on iteration {}", i);
    }
    // 4th should be denied
    let ok = store.allow_sliding_window(key, 2, 3).await.expect("allow");
    assert!(!ok, "should be denied after limit reached");
}

#[tokio::test]
async fn test_sliding_window_limiter_edge_cases() {
    let redis_url = match env::var("REDIS_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("Skipping limiter edge case test because REDIS_URL is not set");
            return;
        }
    };

    use tools_backend::tools::session::SessionStore;
    let mut store = SessionStore::new(&redis_url, "testlim")
        .await
        .expect("session store");

    // Test with zero limit
    let key1 = "testlim:zero:key";
    let mut conn1 = store.get_conn().await.expect("redis conn");
    let _: i64 = redis::cmd("DEL")
        .arg(key1)
        .query_async(&mut conn1)
        .await
        .unwrap();
    let ok = store
        .allow_sliding_window(key1, 60, 0)
        .await
        .expect("allow zero limit");
    assert!(!ok, "should deny when limit is zero");

    // Test with very short window
    let key2 = "testlim:short:key";
    let mut conn2 = store.get_conn().await.expect("redis conn");
    let _: i64 = redis::cmd("DEL")
        .arg(key2)
        .query_async(&mut conn2)
        .await
        .unwrap();
    let ok = store
        .allow_sliding_window(key2, 1, 1)
        .await
        .expect("allow short window");
    assert!(ok, "should allow first request in short window");
    let ok = store
        .allow_sliding_window(key2, 1, 1)
        .await
        .expect("allow short window second");
    assert!(!ok, "should deny second request in short window");

    // Test with very large limit
    let key3 = "testlim:large:key";
    let mut conn3 = store.get_conn().await.expect("redis conn");
    let _: i64 = redis::cmd("DEL")
        .arg(key3)
        .query_async(&mut conn3)
        .await
        .unwrap();
    for i in 0..10 {
        let ok = store
            .allow_sliding_window(key3, 60, 100)
            .await
            .expect("allow large limit");
        assert!(ok, "should allow request {} with large limit", i);
    }
}
