import { findSubstance } from './lib/local/substanceDatabase';
import { performance } from 'perf_hooks';

const start = performance.now();
for (let i = 0; i < 1_000_000; i++) {
  findSubstance('Sertraline');
  findSubstance('alcohol');
  findSubstance('caffeine');
}
const end = performance.now();
console.log(`findSubstance baseline time: ${(end - start).toFixed(2)} ms`);
