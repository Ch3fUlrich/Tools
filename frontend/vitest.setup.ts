import '@testing-library/jest-dom';

// Add global types for jsdom/happy-dom environments
declare global {
  var Headers: typeof Headers;
}

// ✅ Conditionally mock ResizeObserver (for happy-dom safety)
if (!global.ResizeObserver) {
  global.ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
}

// ✅ Mock getComputedStyle for layout-dependent components
Object.defineProperty(window, 'getComputedStyle', {
  value: vi.fn(() => ({
    gap: '16px',
    columnGap: '16px',
    getPropertyValue: vi.fn((prop) => {
      if (prop === 'gap') return '16px';
      if (prop === 'column-gap') return '16px';
      return '';
    }),
  })),
});

// ✅ In-memory, spyable storage mocks
const createStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { for (const k in store) delete store[k]; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
};

Object.defineProperty(globalThis, 'localStorage', { value: createStorage(), writable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: createStorage(), writable: true });

// ✅ Fetch mock (custom responses)
globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
  const urlString = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;

  if (urlString.includes('/api/tools/bloodlevel/substances')) {
    const mockData = [{
      id: 'sub1',
      name: 'Sub',
      halfLifeHours: 24,
      description: 'Test substance',
      category: 'Test',
      commonDosageMg: 10,
      maxDailyDoseMg: 100,
      eliminationRoute: 'liver',
      bioavailabilityPercent: 80,
    }];
    return Promise.resolve({
      ok: true,
      json: async () => mockData,
      text: async () => JSON.stringify(mockData),
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      redirected: false,
      url: urlString,
      clone() { return this; },
    });
  }

  return Promise.resolve({
    ok: true,
    json: async () => ({}),
    text: async () => '',
    status: 200,
    headers: new Headers(),
    redirected: false,
    url: urlString,
    clone() { return this; },
  });
});

// ✅ Mock CSS imports
vi.mock('*.css', () => ({}));
vi.mock('*.scss', () => ({}));
vi.mock('*.module.css', () => ({}));
vi.mock('*.module.scss', () => ({}));
