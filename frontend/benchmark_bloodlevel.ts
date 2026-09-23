import { calculateToleranceLocal } from './lib/local/bloodLevel';
import { SUBSTANCES } from './lib/local/substanceDatabase';
import { performance } from 'perf_hooks';

// Generate a large request
const intakes = [];
const time_points = [];

// 100 intakes
for (let i = 0; i < 100; i++) {
  const substance = SUBSTANCES[i % SUBSTANCES.length];
  intakes.push({
    substance: substance.id,
    time: '2026-01-01T00:00:00.000Z',
    dosage_mg: 100,
  });
}

// 1000 time points
for (let i = 0; i < 1000; i++) {
  time_points.push(`2026-01-01T0${i % 10}:00:00.000Z`);
}

const request = {
  intakes,
  time_points,
};

const start = performance.now();
for (let i = 0; i < 100; i++) {
  calculateToleranceLocal(request);
}
const end = performance.now();
process.stdout.write(`Baseline time: ${(end - start).toFixed(2)} ms\n`);
