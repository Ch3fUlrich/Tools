// Use named exports for all API functions to keep imports consistent across the codebase.
// Use a relative default so tests and client-side code that expect
// relative API paths don't attempt to call an absolute localhost URL.

export * from '../types/api/types';
export * from './endpoints/dice';
export * from './endpoints/fatLoss';
export * from './endpoints/n26';
export * from './endpoints/auth';
export * from './endpoints/bloodLevel';
export * from './endpoints/training';
