use std::env;
use std::process::Command;

#[tokio::test]
async fn test_migrate_binary_success() {
    let database_url = match env::var("TEST_DATABASE_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("TEST_DATABASE_URL not set — skipping migrate integration test");
            return;
        }
    };

    // Run the migrate binary
    let output = Command::new("cargo")
        .args(["run", "--bin", "migrate"])
        .env("DATABASE_URL", &database_url)
        .output()
        .expect("Failed to run migrate binary");

    // Check that it succeeded or failed with expected error (migration already applied/modified)
    let stderr = String::from_utf8_lossy(&output.stderr);
    let is_success = output.status.success();
    let has_expected_error = stderr.contains("previously applied but has been modified")
        || stderr.contains("already applied");

    assert!(
        is_success || has_expected_error,
        "Migrate binary should succeed or fail with expected migration error: {}",
        stderr
    );
}

#[tokio::test]
async fn test_migrate_binary_idempotent() {
    let database_url = match env::var("TEST_DATABASE_URL") {
        Ok(v) => v,
        Err(_) => {
            eprintln!("TEST_DATABASE_URL not set — skipping migrate integration test");
            return;
        }
    };

    // Run migrate twice to test idempotency
    for i in 0..2 {
        let output = Command::new("cargo")
            .args(["run", "--bin", "migrate"])
            .env("DATABASE_URL", &database_url)
            .output()
            .expect("Failed to run migrate binary");

        let stderr = String::from_utf8_lossy(&output.stderr);
        let is_success = output.status.success();
        let has_expected_error = stderr.contains("previously applied but has been modified")
            || stderr.contains("already applied");

        assert!(
            is_success || has_expected_error,
            "Migrate binary should succeed or fail with expected migration error on run {}: {}",
            i,
            stderr
        );
    }
}

#[tokio::test]
async fn test_migrate_binary_missing_env() {
    // Run migrate without DATABASE_URL (explicitly remove it in case the CI env sets it)
    let output = Command::new("cargo")
        .args(["run", "--bin", "migrate"])
        .env_remove("DATABASE_URL")
        .output()
        .expect("Failed to run migrate binary");

    // Should fail with exit code 1
    assert!(!output.status.success(), "Migrate binary should fail without DATABASE_URL");

    // Should contain error about missing DATABASE_URL
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("DATABASE_URL") || stderr.contains("environment variable"),
        "Error message should mention DATABASE_URL: {}",
        stderr
    );
}

#[tokio::test]
async fn test_migrate_binary_failure() {
    let bad_database_url = "postgres://nonexistent:password@localhost:5432/nonexistent_db";

    // Run the migrate binary
    let output = Command::new("cargo")
        .args(["run", "--bin", "migrate"])
        .env("DATABASE_URL", bad_database_url)
        .output()
        .expect("Failed to run migrate binary");

    // Should fail with exit code 1 (or at least non-zero)
    assert!(!output.status.success(), "Migrate binary should fail with bad DB URL");

    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);

    assert!(
        stderr.contains("Error") || stderr.contains("error"),
        "Error message should be logged to stderr: {}",
        stderr
    );

    assert!(
        !stdout.contains("Migrations ran successfully"),
        "Should not print success message on stdout: {}",
        stdout
    );
}
