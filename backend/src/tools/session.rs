use redis::AsyncCommands;
use redis::Client as RedisClient;
use redis::aio::ConnectionManager;
use redis::RedisError;
use redis::ErrorKind as RedisErrorKind;
use std::time::Duration;
// Note: earlier iterations used boxed futures; current helpers use concrete retry loops.
// Keep imports minimal.
use tokio::time::sleep;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
// std::time::Duration is not currently used but might be useful for future TTL logic
// use std::time::Duration;

#[derive(Serialize, Deserialize)]
pub struct SessionData {
    pub user_id: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Lightweight Redis pool/manager abstraction.
/// This intentionally keeps the implementation simple: it owns a `redis::Client`
/// and provides an async method to obtain a multiplexed connection. If you
/// later want a real pool, swap this implementation for one (e.g. a small
/// r2d2-style wrapper or use a ConnectionManager if desired).
pub struct RedisPool {
    manager: ConnectionManager,
}

impl RedisPool {
    /// Create a new RedisPool by building a ConnectionManager from the provided client.
    pub async fn new(client: RedisClient) -> Result<Self, RedisError> {
        let manager = ConnectionManager::new(client).await?;
        Ok(Self { manager })
    }

    /// Return a cloned ConnectionManager which can be used to run commands.
    /// ConnectionManager is cheap to clone and handles reconnects internally.
    pub fn manager(&self) -> ConnectionManager {
        self.manager.clone()
    }
}

pub struct SessionStore {
    pub pool: RedisPool,
    pub namespace: String,
}

impl SessionStore {
    pub async fn new(redis_url: &str, namespace: &str) -> Result<Self, redis::RedisError> {
        let client = RedisClient::open(redis_url)?;
        let pool = RedisPool::new(client).await?;
        Ok(Self { pool, namespace: namespace.to_string() })
    }

    /// Obtain a multiplexed connection from the underlying pool.
    /// This is a thin helper that forwards to `RedisPool::get_conn`.
    /// Return a ConnectionManager clone for running commands.
    pub async fn get_conn(&self) -> Result<ConnectionManager, redis::RedisError> {
        Ok(self.pool.manager())
    }

    // NOTE: Retained older generic retry helper in an earlier refactor; we now
    // use dedicated retry helpers (set_ex_retry, get_retry, del_retry, etc.)
    // which keep the retry loop local and avoid lifetime/generic complexity.

    // Simple dedicated retry helpers to avoid complex generic lifetime bounds
    async fn set_ex_retry(
        &self,
        key: String,
        value: String,
        ttl_secs: u64,
    ) -> Result<(), RedisError> {
        let mut attempt: u32 = 0;
        let max_attempts: u32 = 5;
        let mut backoff_ms: u64 = 50;

        loop {
            attempt += 1;
            let mut mgr = self.get_conn().await?;
            match mgr.set_ex::<_, _, ()>(key.clone(), value.clone(), ttl_secs).await {
                Ok(v) => return Ok(v),
                Err(e) => {
                    if attempt >= max_attempts {
                        return Err(e);
                    }
                    match e.kind() {
                        RedisErrorKind::IoError | RedisErrorKind::TryAgain => {
                            // retry
                        }
                        _ => return Err(e),
                    }
                    let jitter = rand::random::<u8>() as u64 % 20;
                    sleep(Duration::from_millis(backoff_ms + jitter)).await;
                    backoff_ms = (backoff_ms * 2).min(2000);
                    continue;
                }
            }
        }
    }

    async fn get_retry(&self, key: String) -> Result<Option<String>, RedisError> {
        let mut attempt: u32 = 0;
        let max_attempts: u32 = 5;
        let mut backoff_ms: u64 = 50;

        loop {
            attempt += 1;
            let mut mgr = self.get_conn().await?;
            match mgr.get::<_, Option<String>>(key.clone()).await {
                Ok(v) => return Ok(v),
                Err(e) => {
                    if attempt >= max_attempts {
                        return Err(e);
                    }
                    match e.kind() {
                        RedisErrorKind::IoError | RedisErrorKind::TryAgain => {}
                        _ => return Err(e),
                    }
                    let jitter = rand::random::<u8>() as u64 % 20;
                    sleep(Duration::from_millis(backoff_ms + jitter)).await;
                    backoff_ms = (backoff_ms * 2).min(2000);
                    continue;
                }
            }
        }
    }

    async fn del_retry(&self, key: String) -> Result<(), RedisError> {
        let mut attempt: u32 = 0;
        let max_attempts: u32 = 5;
        let mut backoff_ms: u64 = 50;

        loop {
            attempt += 1;
            let mut mgr = self.get_conn().await?;
            match mgr.del::<_, ()>(key.clone()).await {
                Ok(v) => return Ok(v),
                Err(e) => {
                    if attempt >= max_attempts {
                        return Err(e);
                    }
                    match e.kind() {
                        RedisErrorKind::IoError | RedisErrorKind::TryAgain => {}
                        _ => return Err(e),
                    }
                    let jitter = rand::random::<u8>() as u64 % 20;
                    sleep(Duration::from_millis(backoff_ms + jitter)).await;
                    backoff_ms = (backoff_ms * 2).min(2000);
                    continue;
                }
            }
        }
    }

    async fn get_and_del_retry(&self, key: String) -> Result<Option<String>, RedisError> {
        let mut attempt: u32 = 0;
        let max_attempts: u32 = 5;
        let mut backoff_ms: u64 = 50;

        loop {
            attempt += 1;
            let mut mgr = self.get_conn().await?;
            match mgr.get::<_, Option<String>>(key.clone()).await {
                Ok(val) => {
                    if val.is_some() {
                        let () = mgr.del::<_, ()>(key.clone()).await?;
                    }
                    return Ok(val);
                }
                Err(e) => {
                    if attempt >= max_attempts {
                        return Err(e);
                    }
                    match e.kind() {
                        RedisErrorKind::IoError | RedisErrorKind::TryAgain => {}
                        _ => return Err(e),
                    }
                    let jitter = rand::random::<u8>() as u64 % 20;
                    sleep(Duration::from_millis(backoff_ms + jitter)).await;
                    backoff_ms = (backoff_ms * 2).min(2000);
                    continue;
                }
            }
        }
    }

    async fn sliding_window_retry(
        &self,
        key: String,
        member: String,
        now: i64,
        min_score: i64,
        window_secs: usize,
        limit: usize,
    ) -> Result<bool, RedisError> {
        let mut attempt: u32 = 0;
        let max_attempts: u32 = 5;
        let mut backoff_ms: u64 = 50;

        loop {
            attempt += 1;
            let mut mgr = self.get_conn().await?;
            let res = async {
                let _: () = redis::cmd("ZADD")
                    .arg(key.clone())
                    .arg(now)
                    .arg(member.clone())
                    .query_async(&mut mgr)
                    .await?;
                let _: () = redis::cmd("ZREMRANGEBYSCORE")
                    .arg(key.clone())
                    .arg(0)
                    .arg(min_score)
                    .query_async(&mut mgr)
                    .await?;
                let count: i64 = redis::cmd("ZCARD").arg(key.clone()).query_async(&mut mgr).await?;
                let _: () = redis::cmd("EXPIRE")
                    .arg(key.clone())
                    .arg(window_secs)
                    .query_async(&mut mgr)
                    .await?;
                Ok((count as usize) <= limit)
            }
            .await;

            match res {
                Ok(v) => return Ok(v),
                Err(e) => {
                    if attempt >= max_attempts {
                        return Err(e);
                    }
                    match e.kind() {
                        RedisErrorKind::IoError | RedisErrorKind::TryAgain => {}
                        _ => return Err(e),
                    }
                    let jitter = rand::random::<u8>() as u64 % 20;
                    sleep(Duration::from_millis(backoff_ms + jitter)).await;
                    backoff_ms = (backoff_ms * 2).min(2000);
                    continue;
                }
            }
        }
    }

    pub async fn create_session(
        &mut self,
        user_id: Uuid,
        ttl_secs: usize,
    ) -> Result<String, redis::RedisError> {
        let sid = Uuid::new_v4().to_string();
        let key = format!("{}:session:{}", self.namespace, sid);
        let data = SessionData { user_id, created_at: chrono::Utc::now() };
        let payload = serde_json::to_string(&data).map_err(|e| {
            // RedisError does not implement From<(ErrorKind, String)> directly; use the (ErrorKind, &str, String) tuple form
            redis::RedisError::from((
                redis::ErrorKind::TypeError,
                "session serialize error",
                e.to_string(),
            ))
        })?;
        // Run the set_ex inside the retry helper so transient errors are retried.
        let key = key.clone();
        let payload = payload.clone();
        self.set_ex_retry(key, payload, ttl_secs as u64).await?;

        Ok(sid)
    }

    pub async fn get_session(
        &mut self,
        sid: &str,
    ) -> Result<Option<SessionData>, redis::RedisError> {
        let key = format!("{}:session:{}", self.namespace, sid);
        let raw: Option<String> = self.get_retry(key).await?;

        if let Some(s) = raw {
            let data: SessionData = serde_json::from_str(&s).map_err(|e| {
                redis::RedisError::from((
                    redis::ErrorKind::TypeError,
                    "session deserialize error",
                    e.to_string(),
                ))
            })?;
            Ok(Some(data))
        } else {
            Ok(None)
        }
    }

    pub async fn destroy_session(&mut self, sid: &str) -> Result<(), redis::RedisError> {
        let key = format!("{}:session:{}", self.namespace, sid);
        self.del_retry(key).await?;
        Ok(())
    }

    // OIDC state/nonce storage: store under namespace:oidc:state:<state> -> nonce
    pub async fn store_oidc_state(
        &mut self,
        state: &str,
        nonce: &str,
        ttl_secs: usize,
    ) -> Result<(), redis::RedisError> {
        let key = format!("{}:oidc:state:{}", self.namespace, state);
        let key = key.clone();
        let value = nonce.to_string();
        self.set_ex_retry(key, value, ttl_secs as u64).await?;

        Ok(())
    }

    pub async fn take_oidc_nonce(
        &mut self,
        state: &str,
    ) -> Result<Option<String>, redis::RedisError> {
        let key = format!("{}:oidc:state:{}", self.namespace, state);
        // perform get + del inside a retry to handle transient failures
        let key = key.clone();
        let result: Option<String> = self.get_and_del_retry(key).await?;

        Ok(result)
    }

    // Helper for naming history key for sid
    #[allow(dead_code)]
    #[must_use]
    pub fn history_key(&self, sid: &str) -> String {
        format!("{}:history:{}", self.namespace, sid)
    }

    // Sliding-window rate limiter using a Redis sorted set keyed by provided key.
    // Adds an entry with score == current unix seconds and trims entries older than window_secs.
    // Returns Ok(true) if the number of entries after adding is <= limit, otherwise false.
    pub async fn allow_sliding_window(
        &mut self,
        key: &str,
        window_secs: usize,
        limit: usize,
    ) -> Result<bool, redis::RedisError> {
        let now = chrono::Utc::now().timestamp();
        let min_score = now - window_secs as i64;
        // Use ZADD key score member
        let member = format!("{}:{}", now, uuid::Uuid::new_v4());
        let key = key.to_string();
        let member = member.clone();

        let allowed: bool = self
            .sliding_window_retry(key, member, now, min_score, window_secs, limit)
            .await?;

        Ok(allowed)
    }

    // Utility: parse sid from a cookie header string
    #[must_use]
    pub fn parse_sid_from_cookie(cookie_header: &str) -> Option<String> {
        cookie_header.split(';').map(str::trim).find_map(|part| {
            let mut kv = part.splitn(2, '=');
            match (kv.next(), kv.next()) {
                (Some("sid"), Some(v)) => Some(v.to_string()),
                _ => None,
            }
        })
    }
}
