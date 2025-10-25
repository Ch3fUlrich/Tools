import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname) },
      // Ensure relative imports to app globals resolve to the stub during tests
      { find: './globals.css', replacement: path.resolve(__dirname, 'vitest_css_stub.js') },
      { find: 'app/globals.css', replacement: path.resolve(__dirname, 'vitest_css_stub.js') },
      // Redirect any .css imports to a test stub to avoid PostCSS/Vite CSS pipeline in tests
      { find: /\.css$/, replacement: path.resolve(__dirname, 'vitest_css_stub.js') },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // include all key frontend source folders
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
  // exclude test-only helpers and type-only files from coverage calculations
  exclude: ['lib/types/**', '**/*.testable.*'],
  // V8 provider doesn't support numeric threshold fields here.
    },
  },
});
