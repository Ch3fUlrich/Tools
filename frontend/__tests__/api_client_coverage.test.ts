import {
  rollDice,
  calculateFatLoss,
  analyzeN26Data,
  getToleranceSubstances,
  calculateTolerance,
  registerUser,
  loginUser,
  logoutUser,
  startOIDCLogin,
  handleOIDCCallback,
} from '../lib/api/client';

describe('api client full coverage', () => {
  beforeEach(() => {
    (globalThis as any).fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
    delete (globalThis as any).fetch;
    // restore window.location if we changed it
    try {
      delete (globalThis as any).window;
    } catch {}
  });

  it('calculateFatLoss success and failure', async () => {
    const good = { fat_loss_percentage: 10, muscle_loss_percentage: 1, is_valid: true };
    (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, json: async () => good });
    const res = await calculateFatLoss({ kcal_deficit: 500, weight_loss_kg: 1 });
    expect(res).toEqual(good);

    (globalThis as any).fetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'bad request' });
    await expect(calculateFatLoss({ kcal_deficit: 0, weight_loss_kg: 0 })).rejects.toThrow(/Failed to calculate fat loss/);
  });

  it('analyzeN26Data success and failure', async () => {
    const good = { transactions: [], category_totals: {}, overall_total: 0 };
    (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, json: async () => good });
    const res = await analyzeN26Data({});
    expect(res).toEqual(good);

    (globalThis as any).fetch.mockResolvedValueOnce({ ok: false, status: 502, text: async () => 'bad' });
    await expect(analyzeN26Data({})).rejects.toThrow(/Failed to analyze N26 data/);
  });

  it('register/login/logout success and failure branches', async () => {
    const reg = { ok: true, id: 'r1' };
    (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, json: async () => reg });
    const r = await registerUser({ email: 'a@b.com', password: 'p' });
    expect(r).toEqual(reg);

    (globalThis as any).fetch.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: 'exists' }) });
    await expect(registerUser({ email: 'a@b.com', password: 'p' })).rejects.toThrow(/exists/);

    const lg = { ok: true, id: 'u1' };
    (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, json: async () => lg });
    const l = await loginUser({ email: 'a@b.com', password: 'p' });
    expect(l).toEqual(lg);

    (globalThis as any).fetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'bad' }) });
    await expect(loginUser({ email: 'a@b.com', password: 'p' })).rejects.toThrow(/bad/);

    const out = { ok: true };
    (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, json: async () => out });
    const o = await logoutUser();
    expect(o).toEqual(out);

  (globalThis as any).fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'x' }) });
  // When backend returns a JSON error field, client uses that error string directly.
  await expect(logoutUser()).rejects.toThrow('x');
  });

  it('handleOIDCCallback success and failure', async () => {
    const u = { user: { id: 'u2', email: 'e@e.com', created_at: new Date().toISOString() } };
    (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, json: async () => u });
    const res = await handleOIDCCallback({ code: 'c' });
    expect(res).toEqual(u);

  (globalThis as any).fetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'no' }) });
  // When backend returns a JSON error field, client uses that error string directly.
  await expect(handleOIDCCallback({ code: 'c' })).rejects.toThrow('no');
  });

  it('startOIDCLogin sets window.location.href', () => {
    (globalThis as any).window = { location: { href: '' } };
    startOIDCLogin();
    expect((globalThis as any).window.location.href).toContain('/api/auth/oidc/start');
  });

  it('rollDice failure branch (already covered success elsewhere)', async () => {
    (globalThis as any).fetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'err' });
    await expect(rollDice({ die: { type: 'd6' }, count: 1 } as any)).rejects.toThrow(/Roll API error/);
  });

  it('tolerance endpoints success and failure', async () => {
    const subs = [{ id: 's1', name: 'Sub', halfLifeHours: 2 }];
    (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, json: async () => subs });
    const got = await getToleranceSubstances();
    expect(got).toEqual(subs);

    (globalThis as any).fetch.mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'nope' });
    await expect(getToleranceSubstances()).rejects.toThrow(/Failed to get substances/);

    const resp = { blood_levels: [{ time: 't', substance: 's1', amountMg: 1 }] };
    (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, json: async () => resp });
    const calc = await calculateTolerance({ intakes: [], time_points: [] });
    expect(calc).toEqual(resp);

    (globalThis as any).fetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'bad' });
    await expect(calculateTolerance({ intakes: [], time_points: [] })).rejects.toThrow(/Failed to calculate tolerance/);
  });
});
