use redis::aio::Connection;
use redis::AsyncCommands;
use serde::{Serialize, Deserialize};
use uuid::Uuid;
// std::time::Duration is not currently used but might be useful for future TTL logic
// use std::time::Duration;

#[derive(Serialize, Deserialize)]
pub struct SessionData {
    pub user_id: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub struct SessionStore {
    pub conn: Connection,
    pub namespace: String,
}

impl SessionStore {
    pub async fn new(redis_url: &str, namespace: &str) -> Result<Self, redis::RedisError> {
        let client = redis::Client::open(redis_url)?;
        let conn = client.get_tokio_connection().await?;
        Ok(SessionStore { conn, namespace: namespace.to_string() })
    }

    pub async fn create_session(&mut self, user_id: Uuid, ttl_secs: usize) -> Result<String, redis::RedisError> {
        let sid = Uuid::new_v4().to_string();
        let key = format!("{}:session:{}", self.namespace, sid);
        let data = SessionData { user_id, created_at: chrono::Utc::now() };
        let payload = serde_json::to_string(&data).unwrap();
    self.conn.set_ex::<_, _, ()>(key, payload, ttl_secs).await?;
        Ok(sid)
    }

    pub async fn get_session(&mut self, sid: &str) -> Result<Option<SessionData>, redis::RedisError> {
        let key = format!("{}:session:{}", self.namespace, sid);
    let val: Option<String> = self.conn.get::<_, Option<String>>(key).await?;
        if let Some(s) = val {
            let data: SessionData = serde_json::from_str(&s).unwrap();
            Ok(Some(data))
        } else {
            Ok(None)
        }
    }

    pub async fn destroy_session(&mut self, sid: &str) -> Result<(), redis::RedisError> {
        let key = format!("{}:session:{}", self.namespace, sid);
        let _ = self.conn.del::<_, ()>(key).await?;
        Ok(())
    }

    // OIDC state/nonce storage: store under namespace:oidc:state:<state> -> nonce
    pub async fn store_oidc_state(&mut self, state: &str, nonce: &str, ttl_secs: usize) -> Result<(), redis::RedisError> {
        let key = format!("{}:oidc:state:{}", self.namespace, state);
        let _ = self.conn.set_ex::<_, _, ()>(key, nonce.to_string(), ttl_secs).await?;
        Ok(())
    }

    pub async fn take_oidc_nonce(&mut self, state: &str) -> Result<Option<String>, redis::RedisError> {
        let key = format!("{}:oidc:state:{}", self.namespace, state);
        let val: Option<String> = self.conn.get::<_, Option<String>>(key.clone()).await?;
        if val.is_some() {
            let _ = self.conn.del::<_, ()>(key).await?;
        }
        Ok(val)
    }

    // Helper for naming history key for sid
    #[allow(dead_code)]
    pub fn history_key(&self, sid: &str) -> String {
        format!("{}:history:{}", self.namespace, sid)
    }

    // Sliding-window rate limiter using a Redis sorted set keyed by provided key.
    // Adds an entry with score == current unix seconds and trims entries older than window_secs.
    // Returns Ok(true) if the number of entries after adding is <= limit, otherwise false.
    pub async fn allow_sliding_window(&mut self, key: &str, window_secs: usize, limit: usize) -> Result<bool, redis::RedisError> {
        let now = chrono::Utc::now().timestamp();
        let min_score = now - window_secs as i64;
        // Use ZADD key score member
        let member = format!("{}:{}", now, uuid::Uuid::new_v4());
        let _: () = redis::cmd("ZADD").arg(key).arg(now).arg(member.clone()).query_async(&mut self.conn).await?;
        // remove old entries (score < min_score)
        let _: () = redis::cmd("ZREMRANGEBYSCORE").arg(key).arg(0).arg(min_score).query_async(&mut self.conn).await?;
        // count
        let count: i64 = redis::cmd("ZCARD").arg(key).query_async(&mut self.conn).await?;
        // set expire
        let _ : () = redis::cmd("EXPIRE").arg(key).arg(window_secs).query_async(&mut self.conn).await?;
        Ok((count as usize) <= limit)
    }

    // Utility: parse sid from a cookie header string
    pub fn parse_sid_from_cookie(cookie_header: &str) -> Option<String> {
        cookie_header.split(';').map(|s| s.trim()).find_map(|part| {
            let mut kv = part.splitn(2, '=');
            match (kv.next(), kv.next()) {
                (Some(k), Some(v)) if k == "sid" => Some(v.to_string()),
                _ => None,
            }
        })
    }
}
