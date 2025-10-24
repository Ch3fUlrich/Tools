import { rollDice } from '../lib/api/client';

describe('rollDice', () => {
  beforeEach(() => {
    (globalThis as any).fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
    delete (globalThis as any).fetch;
  });

  it('calls fetch with the correct URL and payload and returns json on success', async () => {
    const fakeResp = { summary: { sum: 6 }, rolls: [] };
    (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, json: async () => fakeResp });

    // ensure deterministic URL path
    process.env.NEXT_PUBLIC_API_URL = '';
    const payload = { die: { type: 'd6' }, count: 1 } as any;
    const res = await rollDice(payload);

    expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
    const calledWith = (globalThis as any).fetch.mock.calls[0];
    expect(calledWith[0]).toBe('/api/tools/dice/roll');
    expect(calledWith[1].method).toBe('POST');
    expect(JSON.parse(calledWith[1].body)).toEqual(payload);
    expect(res).toEqual(fakeResp);
  });

  it('throws on non-ok response', async () => {
    (globalThis as any).fetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'error' });
    await expect(rollDice({ die: { type: 'd6' }, count: 1 } as any)).rejects.toThrow('Roll API error: 500');
  });
});
