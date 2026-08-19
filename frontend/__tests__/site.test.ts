import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('site constants', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses default SITE_URL if env is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const site = await import('../lib/site');
    expect(site.SITE_URL).toBe('https://ch3fulrich.github.io/Tools');
  });

  it('respects NEXT_PUBLIC_SITE_URL environment variable', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');
    const site = await import('../lib/site');
    expect(site.SITE_URL).toBe('https://example.com');
  });

  it('exports correct constants', async () => {
    const site = await import('../lib/site');
    expect(site.SITE_NAME).toBe('Tools Collection');
    expect(site.SITE_DESCRIPTION).toContain('fat loss calculator');
    expect(site.PUBLIC_ROUTES.length).toBeGreaterThan(0);
    expect(site.PUBLIC_ROUTES).toContain('/');
    expect(site.PUBLIC_ROUTES).toContain('/tools/dice');
  });
});
