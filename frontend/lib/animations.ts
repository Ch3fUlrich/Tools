// Centralized small animation utilities to be used across components.
// These are Tailwind class strings so components can import and reuse them.
// We prefer `motion-safe` / `motion-reduce` to respect OS reduced-motion settings.
export const interactivePop =
  'transition-transform duration-150 ease-out motion-safe:hover:scale-105 motion-reduce:transition-none';

export const subtleFade =
  'transition-opacity duration-200 ease-in-out motion-reduce:transition-none';

export default {
  interactivePop,
  subtleFade,
};
