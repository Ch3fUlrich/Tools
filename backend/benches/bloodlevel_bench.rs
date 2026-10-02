use chrono::{Duration, Utc};
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use tools_backend::tools::bloodlevel::{calculate_blood_levels, SubstanceIntake, ToleranceRequest};

fn intake(substance: &str, time: chrono::DateTime<Utc>, mg: f64) -> SubstanceIntake {
    SubstanceIntake {
        substance: substance.to_string(),
        time,
        dosage_mg: mg,
        route: None,
        with_food: None,
    }
}

pub fn criterion_benchmark(c: &mut Criterion) {
    let now = Utc::now();
    let mut intakes = Vec::new();
    let mut time_points = Vec::new();

    // 100 intakes
    for i in 0..100 {
        intakes.push(intake("caffeine", now + Duration::hours(i as i64), 100.0));
    }

    // 1000 time points
    for i in 0..1000 {
        time_points.push(now + Duration::minutes(i as i64 * 10));
    }

    c.bench_function("bloodlevel", |b| {
        b.iter_batched(
            || {
                let mut intks = Vec::new();
                for i in 0..100 {
                    intks.push(intake("caffeine", now + Duration::hours(i as i64), 100.0));
                }
                ToleranceRequest { intakes: intks, time_points: time_points.clone() }
            },
            |request| {
                let _ = calculate_blood_levels(black_box(request));
            },
            criterion::BatchSize::SmallInput,
        )
    });
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
