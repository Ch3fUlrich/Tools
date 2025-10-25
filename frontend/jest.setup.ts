// jest setup: provide global fetch mock if needed
try {
  // jest-dom exposes matchers via the package root
  // it's optional for these simple unit tests, so guard in case it's missing
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('@testing-library/jest-dom');
} catch {
  // ignore if not installed
}

if (!(global as any).fetch) {
  // eslint-disable-next-line no-undef
  (global as any).fetch = (global as any).jest ? (global as any).jest.fn() : function () { throw new Error('global.fetch mock not initialized'); };
}
