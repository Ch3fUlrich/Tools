import '@testing-library/jest-dom';

import '@testing-library/jest-dom';

// Add global types for jsdom environment
declare global {
  var Headers: typeof Headers;
}

// Mock ResizeObserver – jsdom implements it natively since v20+
// Keep a lightweight mock for safety (e.g., older jsdom or edge cases)
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Mock getComputedStyle for Header component
Object.defineProperty(window, 'getComputedStyle', {
  value: vi.fn(() => ({
    gap: '16px',
    columnGap: '16px',
    // Add other common properties as needed
    getPropertyValue: vi.fn((prop) => {
      if (prop === 'gap') return '16px';
      if (prop === 'column-gap') return '16px';
      return '';
    }),
  })),
});

// Proper localStorage/sessionStorage mocks (in-memory, spyable)
const createStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      for (const key in store) {
        delete store[key];
      }
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
};

Object.defineProperty(globalThis, 'localStorage', { value: createStorage(), writable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: createStorage(), writable: true });

// Global fetch mock – resolves relative URLs, spyable, default happy response
globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
  const urlString = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
  
  // Mock responses based on URL patterns
  if (urlString.includes('/api/tools/bloodlevel/substances')) {
    return Promise.resolve({
      ok: true,
      json: async () => [
        {
          id: 'sub1',
          name: 'Sub',
          halfLifeHours: 24,
          description: 'Test substance',
          category: 'Test',
          commonDosageMg: 10,
          maxDailyDoseMg: 100,
          eliminationRoute: 'liver',
          bioavailabilityPercent: 80
        }
      ],
      text: async () => JSON.stringify([
        {
          id: 'sub1',
          name: 'Sub',
          halfLifeHours: 24,
          description: 'Test substance',
          category: 'Test',
          commonDosageMg: 10,
          maxDailyDoseMg: 100,
          eliminationRoute: 'liver',
          bioavailabilityPercent: 80
        }
      ]),
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      redirected: false,
      url: urlString,
      clone: function () { return this; },
    });
  }
  
  // Default response for other URLs
  return Promise.resolve({
    ok: true,
    json: async () => ({}),
    text: async () => '',
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    redirected: false,
    url: urlString,
    clone: function () { return this; },
  });
});

// Mock ALL CSS imports globally (plain .css, .module.css, .scss, etc.)
// Returns empty object → no side-effects, no PostCSS/Next.js errors