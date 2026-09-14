// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/lib/api/client';
import * as backendStatus from '@/lib/api/backendStatus';
import ElterngeldOptimizer from '@/components/tools/ElterngeldOptimizer';
import { TestWrapper } from '@/lib/test-utils';

vi.mock('@/lib/api/client', async () => {
  const actual = await import('../lib/api/client');
  return {
    ...actual,
    getUserProfile: vi.fn(),
    listElterngeldScenarios: vi.fn(),
    saveElterngeldScenario: vi.fn(),
    deleteElterngeldScenario: vi.fn(),
    getAuthConfig: vi.fn(),
  };
});

vi.mock('@/lib/api/backendStatus', () => ({
  checkBackend: vi.fn(),
}));

describe('ElterngeldOptimizer Scenarios Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();

    vi.mocked(backendStatus.checkBackend).mockResolvedValue(undefined);
    vi.mocked(api.getAuthConfig).mockResolvedValue({
      localAuthEnabled: false,
      oidcEnabled: true,
      oidcProviderName: 'Authelia',
    });
  });

  it('allows an authenticated user to save and load scenarios', async () => {
    // 1. Setup authenticated user session
    sessionStorage.setItem('auth_user', JSON.stringify({ id: '1', email: 'test@example.com', created_at: '2023-01-01' }));
    vi.mocked(api.getUserProfile).mockResolvedValue({ id: '1', email: 'test@example.com', created_at: '2023-01-01' } as any);
    vi.mocked(api.listElterngeldScenarios).mockResolvedValue([]);

    // 2. Render the full tool
    render(
      <TestWrapper>
        <ElterngeldOptimizer />
      </TestWrapper>
    );

    // Verify it loads with authentication (we see the save inputs button eventually)
    // Wait for the scenario section to say "No saved scenarios yet."
    expect(await screen.findByText('No saved scenarios yet.', {}, { timeout: 15000 })).toBeInTheDocument();

    // 3. Interact with the form (change an input)
    const lowerProfitInput = screen.getByLabelText(/Lower profit/i) as HTMLInputElement;
    fireEvent.change(lowerProfitInput, { target: { value: '45000' } });

    // 4. Save the scenario
    const saveNameInput = screen.getByLabelText(/Scenario name/i);
    fireEvent.change(saveNameInput, { target: { value: 'My 45k Scenario' } });

    vi.mocked(api.saveElterngeldScenario).mockResolvedValue({
      id: 'scen-1',
      name: 'My 45k Scenario',
      updatedAt: '2026-08-28T00:00:00Z',
    });

    // We also need to mock the next list call to return the new scenario
    vi.mocked(api.listElterngeldScenarios).mockResolvedValue([
      {
        id: 'scen-1',
        name: 'My 45k Scenario',
        payload: { profitLow: '45000' },
        createdAt: '2026-08-28T00:00:00Z',
        updatedAt: '2026-08-28T00:00:00Z',
      }
    ]);

    fireEvent.click(screen.getByRole('button', { name: /Save inputs/i }));

    // Wait for the success notice
    expect(await screen.findByText(/Saved “My 45k Scenario”/i, {}, { timeout: 15000 })).toBeInTheDocument();

    // The scenario should now be listed
    expect(await screen.findByText('My 45k Scenario')).toBeInTheDocument();

    // 5. Change the input again
    fireEvent.change(lowerProfitInput, { target: { value: '99999' } });
    expect(lowerProfitInput.value).toBe('99999');

    // 6. Load the scenario back
    fireEvent.click(screen.getByRole('button', { name: /Load My 45k Scenario/i }));

    // Verify the input is restored to what was saved
    await waitFor(() => {
        expect(lowerProfitInput.value).toBe('45000');
    }, { timeout: 15000 });
  }, 30000); // 30s timeout
});
