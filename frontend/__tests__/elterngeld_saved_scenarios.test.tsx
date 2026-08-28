// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authState = { isAuthenticated: true, isLoading: false };
vi.mock('@/components/auth/AuthContext', () => ({
  useOptionalAuth: () => authState,
}));

vi.mock('@/lib/api/client', () => ({
  getAuthConfig: vi.fn(),
  startOIDCLogin: vi.fn(),
  listElterngeldScenarios: vi.fn(),
  saveElterngeldScenario: vi.fn(),
  deleteElterngeldScenario: vi.fn(),
}));

import SavedScenarios from '@/components/tools/elterngeld/SavedScenarios';
import { toPayload, type ElterngeldSnapshot } from '@/components/tools/elterngeld/scenarioState';
import * as api from '@/lib/api/client';

const snapshot: ElterngeldSnapshot = {
  filing: 'married',
  profitDeltaKind: 'timing',
  baseYear: 2026,
  leaveYear: 2026,
  profitLow: '30000',
  profitHigh: '60000',
  employmentGross: '',
  relief: '',
  prepaidBase: '',
  prepaidLeave: '',
  partnerBase: '',
  partnerLeave: '',
  ownLeave: '',
  pflichtKV: false,
  pflichtRV: true,
  pflichtAV: false,
  childless: false,
  children: '',
  maternityEnabled: false,
  weeksBefore: '',
  weeksAfter: '',
  extraContribution: '',
  basisMonths: '12',
  plusMonths: '',
  duringLeave: '',
  multiples: '',
  siblingBonus: false,
};

const stored = {
  id: 'scenario-1',
  name: 'Base case',
  payload: { ...toPayload(snapshot), profitLow: '41000' },
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-02T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  authState.isAuthenticated = true;
  authState.isLoading = false;
  vi.mocked(api.getAuthConfig).mockResolvedValue({
    localAuthEnabled: false,
    oidcEnabled: true,
    oidcProviderName: 'Authelia',
  });
  vi.mocked(api.listElterngeldScenarios).mockResolvedValue([stored]);
});

describe('SavedScenarios', () => {
  it('offers Authelia sign-in instead of a save form when signed out', async () => {
    authState.isAuthenticated = false;
    render(<SavedScenarios snapshot={snapshot} onLoad={vi.fn()} />);

    expect(await screen.findByRole('button', { name: /Continue with/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Scenario name/i)).not.toBeInTheDocument();
    // Nothing is fetched for a signed-out visitor.
    expect(api.listElterngeldScenarios).not.toHaveBeenCalled();
  });

  it('lists the signed-in user’s saved scenarios', async () => {
    render(<SavedScenarios snapshot={snapshot} onLoad={vi.fn()} />);
    expect(await screen.findByText('Base case')).toBeInTheDocument();
  });

  it('saves the current inputs under the typed name', async () => {
    vi.mocked(api.saveElterngeldScenario).mockResolvedValue({
      id: 'x',
      name: 'My run',
      updatedAt: '2026-08-28T00:00:00Z',
    });
    render(<SavedScenarios snapshot={snapshot} onLoad={vi.fn()} />);

    fireEvent.change(await screen.findByLabelText(/Scenario name/i), {
      target: { value: 'My run' },
    });
    fireEvent.submit(screen.getByRole('form', { name: /Save scenario/i }));

    await waitFor(
      () =>
        expect(api.saveElterngeldScenario).toHaveBeenCalledWith(
          'My run',
          expect.objectContaining({ profitLow: '30000', filing: 'married' }),
        ),
      { timeout: 5000 },
    );
  });

  it('refuses to save a blank name without calling the API', async () => {
    render(<SavedScenarios snapshot={snapshot} onLoad={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText(/Scenario name/i), {
      target: { value: '   ' },
    });
    fireEvent.submit(screen.getByRole('form', { name: /Save scenario/i }));

    expect(await screen.findByText(/Give the scenario a name/i)).toBeInTheDocument();
    expect(api.saveElterngeldScenario).not.toHaveBeenCalled();
  });

  it('hands the stored payload back to the form when loaded', async () => {
    const onLoad = vi.fn();
    render(<SavedScenarios snapshot={snapshot} onLoad={onLoad} />);

    fireEvent.click(await screen.findByRole('button', { name: /Load Base case/i }));
    expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ profitLow: '41000' }));
  });

  it('deletes a scenario and reloads the list', async () => {
    vi.mocked(api.deleteElterngeldScenario).mockResolvedValue(undefined);
    render(<SavedScenarios snapshot={snapshot} onLoad={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Delete Base case/i }));
    await waitFor(() => expect(api.deleteElterngeldScenario).toHaveBeenCalledWith('scenario-1'), {
      timeout: 5000,
    });
    expect(api.listElterngeldScenarios).toHaveBeenCalledTimes(2);
  });

  it('surfaces a failed save instead of pretending it worked', async () => {
    vi.mocked(api.saveElterngeldScenario).mockRejectedValue(new Error('backend exploded'));
    render(<SavedScenarios snapshot={snapshot} onLoad={vi.fn()} />);

    fireEvent.change(await screen.findByLabelText(/Scenario name/i), {
      target: { value: 'Doomed' },
    });
    fireEvent.submit(screen.getByRole('form', { name: /Save scenario/i }));

    expect(await screen.findByText(/backend exploded/i)).toBeInTheDocument();
  });
});
