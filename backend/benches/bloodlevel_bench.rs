use criterion::{black_box, criterion_group, criterion_main, Criterion};

use tools_backend::tools::bloodlevel;

pub fn criterion_benchmark(c: &mut Criterion) {
    let substances = bloodlevel::get_substances();

    let mut group = c.benchmark_group("find_substance_by_name");

    let mut map = std::collections::HashMap::new();
    for s in &substances {
        map.insert(s.id.to_lowercase(), s);
        map.insert(s.name.to_lowercase(), s);
    }

    // Simulate what's happening in calculate_blood_levels
    group.bench_function("hashmap_lookup", |b| {
        b.iter(|| {
            for name in &["alcohol", "Acetaminophen (Paracetamol)", "unknown"] {
                bloodlevel::find_substance_by_name(black_box(name), black_box(&map));
            }
        })
    });

    group.finish();
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
