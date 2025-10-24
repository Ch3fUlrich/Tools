import { loginUser, registerUser, logoutUser, handleOIDCCallback } from '../lib/api/client';

describe('auth API client', () => {
  beforeEach(() => {
    (globalThis as any).fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
    delete (globalThis as any).fetch;
  });

  it('registerUser sends correct request and returns json', async () => {
    const fake = { ok: true, id: '123' };
    (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, json: async () => fake });

    const res = await registerUser({ email: 'a@b.com', password: 'p' });
    expect((globalThis as any).fetch).toHaveBeenCalled();
    expect(res).toEqual(fake);
  });

  it('loginUser sends correct request and returns json', async () => {
    const fake = { ok: true, id: 'u1' };
    (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, json: async () => fake });

    const res = await loginUser({ email: 'a@b.com', password: 'p' });
    expect(res).toEqual(fake);
  });

  it('logoutUser calls endpoint and returns json', async () => {
    const fake = { ok: true };
    (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, json: async () => fake });

    const res = await logoutUser();
    expect(res).toEqual(fake);
  });

  it('handleOIDCCallback exchanges code and returns user', async () => {
    const fake = { user: { id: 'u2', email: 'x@y.com', created_at: new Date().toISOString() } };
    (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, json: async () => fake });

    const res = await handleOIDCCallback({ code: 'abc' });
    expect(res).toEqual(fake);
  });
});
