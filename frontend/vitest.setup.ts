// Setup for vitest: provide a global fetch mock if needed
import '@testing-library/jest-dom';
import * as React from 'react';

// Some compiled JSX may expect a global `React` variable (classic runtime).
// Expose React globally for the test environment to be resilient.
(globalThis as any).React = React;

// Always mock global fetch in the test environment so tests can assert on
// call arguments (for example some tests expect '/api/...' as the first arg).
// This prevents Node's native fetch/undici from rejecting relative URLs.
(globalThis as any).fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

// Inform React that tests run in an environment where `act` should be used.
// This reduces spurious "not wrapped in act(...)" warnings from async updates.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Mock ResizeObserver for tests
global.ResizeObserver = class ResizeObserver {
  constructor(callback: any) {
    this.callback = callback;
  }
  callback: any;
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Temporarily filter noisy React "not wrapped in act(...)" warnings that
// originate from a few tests which exercise async effects. These warnings
// should be fixed properly (wrap updates with `act` / use `waitFor` / async
// assertions), but while we triage the repo we suppress them to keep test
// output readable.
const _origConsoleError = console.error;
console.error = (...args: any[]) => {
	try {
		const msg = args[0] && typeof args[0] === 'string' ? args[0] : '';
		// match the common act() warning prefix
		if (/not wrapped in act\(|An update to .* inside a test was not wrapped in act\(/.test(msg)) {
			return;
		}
	} catch {
		// if anything goes wrong, fall back to original
		return _origConsoleError(...args);
	}
	return _origConsoleError(...args);
};

// Mock CSS imports to avoid PostCSS/Next global CSS errors when importing layout in tests.
// This will return an empty object for any import ending with .css
// Use the two-argument overload to avoid a typing error in the Next build.
vi.mock('*.css', () => ({} as any));
