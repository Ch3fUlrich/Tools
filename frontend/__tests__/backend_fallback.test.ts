import {
  checkBackend,
  getBackendStatus,
  markBackendOffline,
  markBackendOnline,
  subscribeBackendStatus,
  resetBackendStatusForTests,
} from '../lib/api/backendStatus';
import { rollDice, calculateFatLoss, getToleranceSubstances, analyzeN26Data } from '../lib/api/client';

describe('backendStatus', () => {
  beforeEach(() => {
    resetBackendStatusForTests();
    (globalThis as any).fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
    resetBackendStatusForTests();
  });

  it('starts unknown, probes /api/health and reports online', async () => {
    (globalThis as any).fetch.mockResolvedValueOnce({ ok: true });
    expect(getBackendStatus()).toBe('unknown');
    await expect(checkBackend()).resolves.toBe(true);
    expect(getBackendStatus()).toBe('online');
    expect((globalThis as any).fetch).toHaveBeenCalledWith('/api/health', expect.anything());
  });

  it('reports offline when the probe fails and notifies subscribers', async () => {
    (globalThis as any).fetch.mockRejectedValueOnce(new TypeError('fetch failed'));
    const listener = vi.fn();
    const unsubscribe = subscribeBackendStatus(listener);
    await expect(checkBackend()).resolves.toBe(false);
    expect(getBackendStatus()).toBe('offline');
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('caches the result instead of probing every call', async () => {
    (globalThis as any).fetch.mockResolvedValue({ ok: true });
    await checkBackend();
    await checkBackend();
    await checkBackend();
    expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
  });

  it('shares one in-flight probe across concurrent callers', async () => {
    (globalThis as any).fetch.mockResolvedValue({ ok: true });
    await Promise.all([checkBackend(), checkBackend(), checkBackend()]);
    expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
  });
});

describe('client fallback to local computation', () => {
  beforeEach(() => {
    resetBackendStatusForTests();
    (globalThis as any).fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
    resetBackendStatusForTests();
  });

  it('falls back to local dice rolling on network failure', async () => {
    (globalThis as any).fetch.mockRejectedValueOnce(new TypeError('fetch failed'));
    const res = (await rollDice({ die: { type: 'd6' }, count: 3 })) as {
      rolls: { used: number[] }[];
    };
    expect(res.rolls[0].used).toHaveLength(3);
    expect(getBackendStatus()).toBe('offline');
  });

  it('skips the network entirely once offline (fast path)', async () => {
    markBackendOffline();
    const res = await calculateFatLoss({ kcal_deficit: 7000, weight_loss_kg: 1 });
    expect(res.is_valid).toBe(true);
    expect(res.fat_loss_percentage).toBeCloseTo(100, 6);
    // Only the background health re-probe may touch fetch — never the tool endpoint.
    const calls = ((globalThis as any).fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.every(([url]: [string]) => String(url).includes('/api/health'))).toBe(true);
  });

  it('does NOT fall back on backend HTTP errors', async () => {
    markBackendOnline();
    (globalThis as any).fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'bad request',
    });
    await expect(calculateFatLoss({ kcal_deficit: 0, weight_loss_kg: 0 })).rejects.toThrow(
      /Failed to calculate fat loss/,
    );
    expect(getBackendStatus()).toBe('online');
  });

  it('serves the local substance list offline', async () => {
    markBackendOffline();
    const subs = await getToleranceSubstances();
    expect(subs.map((s) => s.id)).toContain('caffeine');
  });

  it('analyzes N26 data locally offline', async () => {
    markBackendOffline();
    const res = await analyzeN26Data({
      data: { bankTransfers: [{ amount: 5, ts: '2024-01-01', reference_text: 'x' }] },
    });
    expect(res.overall_total).toBeCloseTo(5);
  });

  it('marks the backend online again after a successful call', async () => {
    markBackendOnline();
    (globalThis as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ fat_loss_percentage: 50, muscle_loss_percentage: 50, is_valid: true }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });
    const res = await calculateFatLoss({ kcal_deficit: 4100, weight_loss_kg: 1 });
    expect(res.is_valid).toBe(true);
    expect(getBackendStatus()).toBe('online');
  });
});
