use criterion::{criterion_group, criterion_main, Criterion};
use serde_json::Value as JsonValue;
use std::time::Duration;
use uuid::Uuid;

#[derive(Clone)]
struct MockRow {
    id: Uuid,
    payload: JsonValue,
    created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(serde::Serialize)]
pub struct HistoryEntry {
    pub id: Option<String>,
    pub payload: JsonValue,
    pub created_at: String,
}

fn fetch_in_rust(rows: &[MockRow]) -> String {
    let mut out: Vec<HistoryEntry> = Vec::with_capacity(rows.len());
    for r in rows {
        out.push(HistoryEntry {
            id: Some(r.id.to_string()),
            payload: r.payload.clone(),
            created_at: r.created_at.to_rfc3339(),
        });
    }
    serde_json::to_string(&out).unwrap()
}

fn fetch_in_sql(json_payload: &str) -> String {
    json_payload.to_string()
}

fn bench_history(c: &mut Criterion) {
    let mut group = c.benchmark_group("dice_history_serialization");
    group.measurement_time(Duration::from_secs(5));

    let mut rows = Vec::new();
    for i in 0..50 {
        rows.push(MockRow {
            id: Uuid::new_v4(),
            payload: serde_json::json!({
                "type": "d20",
                "result": (i % 20) + 1,
                "modifier": 2,
                "total": (i % 20) + 3,
                "advantage": false,
                "disadvantage": false
            }),
            created_at: chrono::Utc::now(),
        });
    }

    let json_payload = fetch_in_rust(&rows);

    group.bench_function("map_rows_in_rust_and_serialize", |b| {
        b.iter(|| fetch_in_rust(&rows));
    });

    group.bench_function("fetch_pre_serialized_from_sql", |b| {
        b.iter(|| fetch_in_sql(&json_payload));
    });

    group.finish();
}

criterion_group!(benches, bench_history);
criterion_main!(benches);
