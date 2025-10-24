use argon2::{Argon2, password_hash::{SaltString, PasswordHash}};
use argon2::PasswordHasher;
use argon2::PasswordVerifier;
use sqlx::Row;
use rand_core::OsRng;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: Uuid,
    pub _email: String,
    pub _display_name: Option<String>,
}

pub async fn register_user(pool: &PgPool, email: &str, password: &str, display_name: Option<&str>) -> Result<Uuid, sqlx::Error> {
    // Basic validation
    if email.trim().is_empty() {
        return Err(sqlx::Error::RowNotFound); // Use a generic error for invalid input
    }
    if password.trim().is_empty() {
        return Err(sqlx::Error::RowNotFound);
    }

    // Hash password with Argon2id
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(password.as_bytes(), &salt).unwrap().to_string();

    let rec = sqlx::query("INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id")
        .bind(email)
        .bind(password_hash)
        .bind(display_name)
        .fetch_one(pool)
        .await?;

    // The returned row may be generic; extract id by column
    let id: Uuid = rec.try_get("id")?;
    Ok(id)
}

#[allow(dead_code)]
pub async fn verify_password(stored: &str, password: &str) -> Result<bool, argon2::password_hash::Error> {
    let parsed = PasswordHash::new(stored)?;
    Ok(Argon2::default().verify_password(password.as_bytes(), &parsed).is_ok())
}
