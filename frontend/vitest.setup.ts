// Setup for vitest: provide a global fetch mock if needed
import '@testing-library/jest-dom';
import * as React from 'react';

// Some compiled JSX may expect a global `React` variable (classic runtime).
// Expose React globally for the test environment to be resilient.
(globalThis as any).React = React;

if (!(globalThis as any).fetch) {
  (globalThis as any).fetch = vi.fn();
}

// Mock CSS imports to avoid PostCSS/Next global CSS errors when importing layout in tests.
// This will return an empty object for any import ending with .css
// Use the two-argument overload to avoid a typing error in the Next build.
vi.mock('*.css', () => ({} as any));
