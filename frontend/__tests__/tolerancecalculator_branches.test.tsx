import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/api/client', () => ({
  getToleranceSubstances: vi.fn(),
  calculateTolerance: vi.fn(),
}));

import { getToleranceSubstances, calculateTolerance } from '../lib/api/client';
import ToleranceCalculator from '../components/tools/ToleranceCalculator';

describe('ToleranceCalculator branches', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows loaded substances and runs calculation path', async () => {
    (getToleranceSubstances as any).mockResolvedValueOnce([{ id: 's1', name: 'Sub', halfLifeHours: 2 }]);
    (calculateTolerance as any).mockResolvedValueOnce({ blood_levels: [{ time: 't', substance: 'Sub', amountMg: 5 }] });

    render(<ToleranceCalculator />);

    // wait for options to be populated
    await waitFor(() => expect(screen.getByText('Sub')).toBeInTheDocument());

    // choose substance
  const select = screen.getByDisplayValue('Select substance...') as any;
  fireEvent.change(select, { target: { value: 'Sub' } });

    // fill dosage
    const dosage = screen.getByPlaceholderText('mg') as HTMLInputElement;
    fireEvent.change(dosage, { target: { value: '10' } });

    // click calculate
    const btn = screen.getByRole('button', { name: /calculate blood levels/i });
    fireEvent.click(btn);

    // wait for chart title to appear
    await waitFor(() => expect(screen.getByText(/Sub Blood Levels/)).toBeInTheDocument());
  });

  it('handles calculateTolerance error and shows error message', async () => {
    (getToleranceSubstances as any).mockResolvedValueOnce([]);
    (calculateTolerance as any).mockRejectedValueOnce(new Error('boom'));

    render(<ToleranceCalculator />);

    // set a substance and dosage to allow request payload
    // since no substances loaded, we manipulate the DOM inputs directly
    const dosage = await screen.findByPlaceholderText('mg');
    fireEvent.change(dosage, { target: { value: '1' } });

    const btn = screen.getByRole('button', { name: /calculate blood levels/i });
    fireEvent.click(btn);

    await waitFor(() => expect(screen.getByText(/Calculation failed|Tolerance calc error|boom/i)).toBeTruthy());
  });
});
