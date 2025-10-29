import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the api client functions used by ToleranceCalculator
vi.mock('@/lib/api/client', async () => {
  const actual = await import('../lib/api/client');
  return {
    ...actual,
    getToleranceSubstances: vi.fn().mockResolvedValue([{ id: '1', name: 'TestSub' }]),
    calculateTolerance: vi.fn().mockResolvedValue({ blood_levels: [{ time: new Date().toISOString(), value: 1 }] }),
  };
});

import BloodLevelCalculator from '@/components/tools/BloodLevelCalculator';
import * as api from '@/lib/api/client';

describe('ToleranceCalculator', () => {
  beforeEach(() => {
    // reset mocks
    vi.resetAllMocks();
  });

  it('renders and runs calculation flow', async () => {
    const getSub = vi.spyOn(api, 'getToleranceSubstances').mockResolvedValue([
      { id: '1', name: 'TestSub', halfLifeHours: 4, description: 't', category: 'c' }
    ] as any);
    const calc = vi.spyOn(api, 'calculateTolerance').mockResolvedValue({ blood_levels: [{ time: new Date().toISOString(), substance: 'TestSub', amountMg: 2 }] } as any);

  render(<BloodLevelCalculator />);

    // wait for substance options to load (select should include TestSub)
    await waitFor(() => expect(getSub).toHaveBeenCalled());

    // Click add intake then select the substance and set dosage
    const addBtn = screen.getByRole('button', { name: /Add Intake/i });
    fireEvent.click(addBtn);

    // there should be selects; pick the first substance select and change value
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
    fireEvent.change(selects[0], { target: { value: 'TestSub' } });

    // set dosage input (number inputs are role spinbutton)
    const inputs = screen.getAllByRole('spinbutton');
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: '10' } });
    }

    // Run calculation
    const calcBtn = screen.getByRole('button', { name: /Calculate Blood Levels/i });
    fireEvent.click(calcBtn);

    await waitFor(() => expect(calc).toHaveBeenCalled());

    // after calculation, the LineChart svg should be present
    await waitFor(() => expect(document.querySelector('svg')).toBeTruthy());
  });
});
