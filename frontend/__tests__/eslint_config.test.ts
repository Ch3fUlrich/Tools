import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('eslint.config.mjs', () => {
  let originalConsoleWarn: any;
  let warnMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    warnMock = vi.fn();
    originalConsoleWarn = console.warn;
    console.warn = warnMock;
    vi.resetModules();
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    vi.restoreAllMocks();
  });

  it('handles missing @eslint/js dependency gracefully', async () => {
    // Statically throw when module evaluates
    vi.doMock('@eslint/js', () => {
      throw new Error('Module @eslint/js not found');
    });

    const config = await import('../eslint.config.mjs');

    expect(warnMock).toHaveBeenCalledWith('@eslint/js not available; using minimal fallback');
    expect(Array.isArray(config.default)).toBe(true);
  });

  it('handles optional dependencies gracefully when missing', async () => {
    vi.doMock('@eslint/js', () => ({ default: { configs: { recommended: {} } } }));
    vi.doMock('@typescript-eslint/parser', () => { throw new Error('Parser error'); });
    vi.doMock('@typescript-eslint/eslint-plugin', () => { throw new Error('Plugin error'); });
    vi.doMock('eslint-plugin-react', () => { throw new Error('React error'); });
    vi.doMock('eslint-plugin-react-hooks', () => { throw new Error('Hooks error'); });
    vi.doMock('eslint-plugin-jsx-a11y', () => { throw new Error('A11y error'); });

    const config = await import('../eslint.config.mjs');

    // Vitest wraps errors thrown in `vi.doMock` inside an internal Vitest Error object
    // We expect the catch block to log this internal error message as expected fallback operation
    const expectedVitestError = expect.stringContaining('[vitest] There was an error when mocking a module');

    expect(warnMock).toHaveBeenCalledWith('Optional import @typescript-eslint/parser failed; continuing without it:', expectedVitestError);
    expect(warnMock).toHaveBeenCalledWith('Optional import @typescript-eslint/eslint-plugin failed; continuing without it:', expectedVitestError);
    expect(warnMock).toHaveBeenCalledWith('Optional import eslint-plugin-react failed; continuing without it:', expectedVitestError);
    expect(warnMock).toHaveBeenCalledWith('Optional import eslint-plugin-react-hooks failed; continuing without it:', expectedVitestError);
    expect(warnMock).toHaveBeenCalledWith('Optional import eslint-plugin-jsx-a11y failed; continuing without it:', expectedVitestError);

    expect(Array.isArray(config.default)).toBe(true);
  });

});
