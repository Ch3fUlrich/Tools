use criterion::{criterion_group, criterion_main, BenchmarkId, Criterion};
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Deserialize, Clone)]
pub struct ExerciseFilterParams {
    pub equipment: Option<String>,
    pub muscle: Option<String>,
    pub pattern: Option<String>,
    pub difficulty: Option<String>,
    pub search: Option<String>,
}

#[derive(Clone)]
struct MockRow {
    id: Uuid,
    equipment: Option<String>,
    movement_pattern: Option<String>,
    difficulty: Option<String>,
    name: Option<String>,
}

fn fetch_in_rust(rows: &[MockRow], params: &ExerciseFilterParams) -> Vec<Uuid> {
    rows.iter()
        .filter(|row| {
            let matches_equipment = params
                .equipment
                .as_ref()
                .is_none_or(|eq| row.equipment.as_deref() == Some(eq.as_str()));
            let matches_pattern = params
                .pattern
                .as_ref()
                .is_none_or(|p| row.movement_pattern.as_deref() == Some(p.as_str()));
            let matches_difficulty = params
                .difficulty
                .as_ref()
                .is_none_or(|d| row.difficulty.as_deref() == Some(d.as_str()));
            let matches_search = params.search.as_ref().is_none_or(|s| {
                row.name.as_ref().is_some_and(|n| n.to_lowercase().contains(&s.to_lowercase()))
            });
            matches_equipment && matches_pattern && matches_difficulty && matches_search
        })
        .map(|row| row.id)
        .collect()
}

// In our SQL approach, we simulate only parsing the exact rows that match the query
fn fetch_in_sql(filtered_rows: &[MockRow]) -> Vec<Uuid> {
    // SQL already did the filtering, so we just map
    filtered_rows.iter().map(|row| row.id).collect()
}

fn bench_filtering(c: &mut Criterion) {
    let mut group = c.benchmark_group("exercises_filtering");

    // Generate 1000 exercises
    let mut rows = Vec::new();
    for i in 0..1000 {
        rows.push(MockRow {
            id: Uuid::new_v4(),
            equipment: Some(if i % 4 == 0 { "dumbbell" } else { "barbell" }.to_string()),
            movement_pattern: Some(if i % 3 == 0 { "push" } else { "pull" }.to_string()),
            difficulty: Some("beginner".to_string()),
            name: Some(format!("Bench Exercise {}", i)),
        });
    }

    let params = ExerciseFilterParams {
        equipment: Some("dumbbell".to_string()),
        muscle: None,
        pattern: Some("push".to_string()),
        difficulty: Some("beginner".to_string()),
        search: None,
    };

    let filtered_rows: Vec<MockRow> = rows
        .iter()
        .filter(|row| {
            let matches_equipment = params
                .equipment
                .as_ref()
                .is_none_or(|eq| row.equipment.as_deref() == Some(eq.as_str()));
            let matches_pattern = params
                .pattern
                .as_ref()
                .is_none_or(|p| row.movement_pattern.as_deref() == Some(p.as_str()));
            matches_equipment && matches_pattern
        })
        .cloned()
        .collect();

    group.bench_function("fetch_in_rust_1000_rows", |b| {
        b.iter(|| fetch_in_rust(&rows, &params));
    });

    // Simulated sql response time isn't here, this just benching the rust side of overhead
    // which in SQL approach only maps the returned 83 rows.
    group.bench_function("fetch_in_sql_mapping_83_rows", |b| {
        b.iter(|| fetch_in_sql(&filtered_rows));
    });

    group.finish();
}

criterion_group!(benches, bench_filtering);
criterion_main!(benches);
