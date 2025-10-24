use sqlx::postgres::PgPoolOptions;
// Note: we previously inspected sqlx errors by type; current code only needs string inspection
use std::env;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new().max_connections(5).connect(&database_url).await?;

    // Use sqlx migrate to run migrations from ./migrations
    let migrator = sqlx::migrate!();
    match migrator.run(&pool).await {
        Ok(_) => {
            println!("Migrations applied");
            Ok(())
        }
        Err(e) => {
            // sqlx::migrate::MigrateError doesn't expose the exact DB error type easily across
            // backends; inspect the string for the common duplicate-key message that happens
            // when migrations have already been inserted into the _sqlx_migrations table.
            let msg = e.to_string();
            if msg.contains("duplicate key value") || msg.contains("_sqlx_migrations_pkey") {
                eprintln!("Notice: migrations appear already applied ({}). Treating as success.", msg);
                return Ok(());
            }
            Err(e.into())
        }
    }
}
