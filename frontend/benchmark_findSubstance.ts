import { calculateToleranceLocal } from './lib/local/bloodLevel';
import { SUBSTANCES } from './lib/local/substanceDatabase';
import { performance } from 'perf_hooks';

// We want to emphasize the bySubstance mapping.
const intakes = [];
const time_points = ['2026-01-01T01:00:00.000Z'];

// 15 substances
for (let i = 0; i < 10000; i++) {
  const substance = SUBSTANCES[i % SUBSTANCES.length];
  // use different casing to force more distinct keys if we want? No, they are the same
  intakes.push({
    substance: i % 2 === 0 ? substance.id : substance.name,
    time: '2026-01-01T00:00:00.000Z',
    dosage_mg: 10,
  });
}

const request = {
  intakes,
  time_points,
};

const start = performance.now();
for (let i = 0; i < 1000; i++) {
  calculateToleranceLocal(request);
}
const end = performance.now();
process.stdout.write(`Baseline time: ${(end - start).toFixed(2)} ms\n`);
