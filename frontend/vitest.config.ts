import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname) },
    ],
  },
  // Optimize Vite server for testing
  server: {
    hmr: false, // Disable HMR for tests
  },
  test: {
    environment: 'node', // Use Node for speed, mock DOM APIs as needed
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Optimize worker count for Node environment
    pool: 'threads',
    maxWorkers: 16, // Higher worker count works better with Node
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // include all key frontend source folders
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
      // exclude test-only helpers and type-only files from coverage calculations
      exclude: ['lib/types/**', '**/*.testable.*'],
      // Ensure coverage directory exists
      reportsDirectory: './coverage',
    },
  },
});
