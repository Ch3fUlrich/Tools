import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  getToleranceSubstances: vi.fn().mockResolvedValue([{ id: '1', name: 'FAKE_SUBSTANCE', halfLifeHours: 4 }]),
  calculateTolerance: vi.fn().mockResolvedValue({ blood_levels: [] })
}));

import BloodLevelPage from '@/app/tools/bloodlevel/page';
import { TestWrapper } from '@/lib/test-utils';

describe('BloodLevel page', () => {
  it('renders the BloodLevel page component', async () => {
    await act(async () => {
      render(<TestWrapper><BloodLevelPage /></TestWrapper>);
      await new Promise(r => setTimeout(r, 50));
    });
    // BloodLevelCalculator renders a button labeled 'Add Intake' in tests; assert presence
    expect(screen.queryByRole('button', { name: /Add Intake/i })).toBeTruthy();
    // Wait for the async API call in BloodLevelCalculator to resolve
    const api = await import('@/lib/api/client');
    await waitFor(() => expect(api.getToleranceSubstances).toHaveBeenCalled());
    // Wait for the state update to apply to the DOM
    expect(await screen.findByText(/FAKE_SUBSTANCE/)).toBeInTheDocument();
  });
});
