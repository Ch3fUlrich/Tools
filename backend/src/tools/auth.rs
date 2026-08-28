use argon2::PasswordHasher;
use argon2::PasswordVerifier;
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, SaltString},
    Argon2,
};
use sqlx::PgPool;
use sqlx::Row;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: Uuid,
}

pub async fn register_user(
    pool: &PgPool,
    email: &str,
    password: &str,
    display_name: Option<&str>,
) -> Result<Uuid, sqlx::Error> {
    // Validation lives in validate_credentials so the API layer can answer 400 with a
    // reason instead of turning every bad input into an opaque 500.
    if validate_credentials(email, password).is_err() {
        return Err(sqlx::Error::RowNotFound);
    }

    // Hash password with Argon2id
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = match argon2.hash_password(password.as_bytes(), &salt) {
        Ok(h) => h.to_string(),
        Err(e) => {
            // Map hashing failures into a generic sqlx error so callers receive an Err
            return Err(sqlx::Error::Protocol(e.to_string()));
        }
    };

    let rec = sqlx::query(
        "INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(email)
    .bind(password_hash)
    .bind(display_name)
    .fetch_one(pool)
    .await?;

    // The returned row may be generic; extract id by column
    let id: Uuid = rec.try_get("id")?;
    Ok(id)
}

pub async fn verify_password(
    stored: &str,
    password: &str,
) -> Result<bool, argon2::password_hash::Error> {
    let parsed = PasswordHash::new(stored)?;
    Ok(Argon2::default().verify_password(password.as_bytes(), &parsed).is_ok())
}

/// A real Argon2id hash of a random value nobody can log in with, used to spend the same
/// CPU on a login for an address that does not exist as on one that does.
///
/// Without it, login is a user-enumeration oracle: a miss returns as fast as a database
/// lookup, a hit costs a full Argon2 verification. The difference is tens of milliseconds
/// and trivially measurable over a network, so an attacker can map which addresses have
/// accounts before trying a single password.
///
/// Derived at first use rather than hardcoded: a hand-written hash string that failed to
/// parse would make `verify_password` bail out early and do no work at all, quietly
/// reinstating the very timing difference this exists to remove.
static DUMMY_PASSWORD_HASH: std::sync::LazyLock<String> = std::sync::LazyLock::new(|| {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(b"no-account-with-this-password", &salt)
        .map(|h| h.to_string())
        .unwrap_or_default()
});

/// Burn the same time a real verification would, then report failure.
pub async fn verify_password_dummy(password: &str) {
    let _ = verify_password(&DUMMY_PASSWORD_HASH, password).await;
}

/// Argon2 cost scales with input length, so an unbounded password is a cheap way to make
/// the server do expensive work. Real passwords are nowhere near this.
pub const MAX_PASSWORD_BYTES: usize = 1024;
pub const MIN_PASSWORD_CHARS: usize = 8;
pub const MAX_EMAIL_BYTES: usize = 254; // RFC 5321 limit on a forward path

/// Why a registration was rejected. Distinguishing these lets the API answer 400 instead of
/// a blanket 500, without saying anything about whether an address is already taken.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RegistrationError {
    EmailMissing,
    EmailMalformed,
    EmailTooLong,
    PasswordTooShort,
    PasswordTooLong,
}

impl RegistrationError {
    pub fn message(self) -> &'static str {
        match self {
            RegistrationError::EmailMissing => "email is required",
            RegistrationError::EmailMalformed => "email is not a valid address",
            RegistrationError::EmailTooLong => "email is too long",
            RegistrationError::PasswordTooShort => "password must be at least 8 characters",
            RegistrationError::PasswordTooLong => "password is too long",
        }
    }
}

/// Deliberately permissive: enough to reject obvious junk without rejecting addresses that
/// are legal but unusual. Anything stricter belongs in a confirmation email, not a regex.
pub fn validate_credentials(email: &str, password: &str) -> Result<(), RegistrationError> {
    let email = email.trim();
    if email.is_empty() {
        return Err(RegistrationError::EmailMissing);
    }
    if email.len() > MAX_EMAIL_BYTES {
        return Err(RegistrationError::EmailTooLong);
    }
    let mut parts = email.split('@');
    let local = parts.next().unwrap_or("");
    let domain = parts.next().unwrap_or("");
    if parts.next().is_some()
        || local.is_empty()
        || domain.is_empty()
        || !domain.contains('.')
        || domain.starts_with('.')
        || domain.ends_with('.')
        || email.contains(char::is_whitespace)
    {
        return Err(RegistrationError::EmailMalformed);
    }

    if password.trim().chars().count() < MIN_PASSWORD_CHARS {
        return Err(RegistrationError::PasswordTooShort);
    }
    if password.len() > MAX_PASSWORD_BYTES {
        return Err(RegistrationError::PasswordTooLong);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_ordinary_addresses() {
        for email in ["a@b.co", "first.last+tag@sub.example.com", "USER@EXAMPLE.ORG"] {
            assert!(validate_credentials(email, "correct horse battery").is_ok(), "{email}");
        }
    }

    #[test]
    fn rejects_addresses_that_are_obviously_not_addresses() {
        let cases = [
            ("", RegistrationError::EmailMissing),
            ("   ", RegistrationError::EmailMissing),
            ("nobody", RegistrationError::EmailMalformed),
            ("no@domain", RegistrationError::EmailMalformed),
            ("@example.com", RegistrationError::EmailMalformed),
            ("two@at@example.com", RegistrationError::EmailMalformed),
            ("space in@example.com", RegistrationError::EmailMalformed),
            ("trailing@example.", RegistrationError::EmailMalformed),
        ];
        for (email, expected) in cases {
            assert_eq!(
                validate_credentials(email, "correct horse battery"),
                Err(expected),
                "{email}"
            );
        }
    }

    #[test]
    fn bounds_the_email_length() {
        let long = format!("{}@example.com", "a".repeat(MAX_EMAIL_BYTES));
        assert_eq!(
            validate_credentials(&long, "correct horse battery"),
            Err(RegistrationError::EmailTooLong)
        );
    }

    #[test]
    fn enforces_a_minimum_password_length() {
        assert_eq!(
            validate_credentials("a@b.co", "short"),
            Err(RegistrationError::PasswordTooShort)
        );
    }

    #[test]
    fn bounds_the_password_so_hashing_cannot_be_weaponised() {
        // Argon2 cost scales with input length, so an unbounded password is a cheap way to
        // make the server burn CPU on demand.
        let huge = "x".repeat(MAX_PASSWORD_BYTES + 1);
        assert_eq!(validate_credentials("a@b.co", &huge), Err(RegistrationError::PasswordTooLong));
    }

    #[tokio::test]
    async fn the_dummy_hash_is_real_work_not_a_parse_failure() {
        // If DUMMY_PASSWORD_HASH were malformed, verify_password would bail out on the
        // parse and do no hashing — silently restoring the timing oracle it exists to
        // remove. Assert it parses and actually rejects.
        assert!(PasswordHash::new(&DUMMY_PASSWORD_HASH).is_ok(), "dummy hash must parse");
        assert!(!verify_password(&DUMMY_PASSWORD_HASH, "anything").await.unwrap());
    }

    #[tokio::test]
    async fn a_registered_password_verifies_and_a_wrong_one_does_not() {
        let salt = SaltString::generate(&mut OsRng);
        let hash =
            Argon2::default().hash_password(b"correct horse battery", &salt).unwrap().to_string();
        assert!(verify_password(&hash, "correct horse battery").await.unwrap());
        assert!(!verify_password(&hash, "wrong horse battery").await.unwrap());
    }
}
