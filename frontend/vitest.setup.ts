// Setup for vitest: provide a global fetch mock if needed
import '@testing-library/jest-dom';

// Mock DOM APIs for Node environment
(globalThis as any).window = globalThis;
// Create a proper classList mock
const createClassList = () => {
  const classes = new Set<string>();
  return {
    add: vi.fn((...classNames: string[]) => {
      classNames.forEach(name => classes.add(name));
    }),
    remove: vi.fn((...classNames: string[]) => {
      classNames.forEach(name => classes.delete(name));
    }),
    contains: vi.fn((className: string) => classes.has(className)),
    toggle: vi.fn((className: string) => {
      if (classes.has(className)) {
        classes.delete(className);
        return false;
      } else {
        classes.add(className);
        return true;
      }
    }),
  };
};

(globalThis as any).document = {
  documentElement: {
    classList: createClassList(),
    style: {},
  },
  createElement: vi.fn(() => ({
    classList: createClassList(),
    style: {},
  })),
  body: {
    classList: createClassList(),
    style: {},
  },
};

// Create a proper localStorage mock
const createStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

(globalThis as any).localStorage = createStorage();
(globalThis as any).sessionStorage = createStorage();

// Always mock global fetch in the test environment so tests can assert on
// call arguments (for example some tests expect '/api/...' as the first arg).
// This prevents Node's native fetch/undici from rejecting relative URLs.
(globalThis as any).fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

// Mock CSS imports to avoid PostCSS/Next global CSS errors when importing layout in tests.
// This will return an empty object for any import ending with .css
// Use the two-argument overload to avoid a typing error in the Next build.
vi.mock('*.css', () => ({} as any));
