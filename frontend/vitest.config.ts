import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname) },
    ],
  },
  server: {
    hmr: false,
  },
  test: {
    environment: 'happy-dom',
    //environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
        // Maximize CPU usage with threads pool and reasonable worker count
    pool: 'threads',
    maxWorkers: 16, // Reduced from 32 to prevent thread pool timeouts
    // Run independent files in parallel, keep tests inside a file sequential
    fileParallelism: true,
    // Isolate module registry per file to prevent mock pollution between tests
    isolate: true,
    watch: false,
    sequence: {
      hooks: 'stack', // Faster hook execution
      concurrent: false,
    },
    cache: {
      dir: './node_modules/.vitest-cache',
    },
    reporters: ['default'],
    // Global timeouts – fail-fast on hangs
    testTimeout: 10_000,  // 10s per test
    hookTimeout: 5_000,   // 5s per hook
    // suiteTimeout: 60_000, // Uncomment if you have huge files
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
      exclude: ['lib/types/**', '**/*.testable.*'],
      reportsDirectory: './coverage',
      // Parallelize coverage post-processing
      processingConcurrency: 32,
    },
  },
});