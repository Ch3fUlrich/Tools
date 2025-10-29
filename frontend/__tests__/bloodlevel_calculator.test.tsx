// Consolidated tests for BloodLevelCalculator (formerly ToleranceCalculator)
// Combines the key coverage from the previous tolerancecalculator_* tests
import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the api client functions used by BloodLevelCalculator
vi.mock('@/lib/api/client', async () => {
  const actual = await import('../lib/api/client');
  return {
    ...actual,
    getToleranceSubstances: vi.fn().mockResolvedValue([]),
    calculateTolerance: vi.fn().mockResolvedValue({ blood_levels: [] }),
  };
});

import * as api from '@/lib/api/client';
import BloodLevelCalculator from '@/components/tools/BloodLevelCalculator';

describe('BloodLevelCalculator (consolidated)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders and runs main calculation flow', async () => {
    const getSub = vi.spyOn(api, 'getToleranceSubstances').mockResolvedValue([
      { id: '1', name: 'TestSub', halfLifeHours: 4, description: 't', category: 'c' }
    ] as any);
    const calc = vi.spyOn(api, 'calculateTolerance').mockResolvedValue({ blood_levels: [{ time: new Date().toISOString(), substance: 'TestSub', amountMg: 2 }] } as any);

  const { container } = render(<BloodLevelCalculator />);

  // wait for substance options to load
  await waitFor(() => expect(getSub).toHaveBeenCalled());

  // Add intake, choose substance, set dosage (scoped to this render)
  const addBtn = within(container).getByRole('button', { name: /Add Intake|\+ Add Intake/i });
  fireEvent.click(addBtn);

  const selects = within(container).getAllByRole('combobox');
  expect(selects.length).toBeGreaterThan(0);
  fireEvent.change(selects[0], { target: { value: 'TestSub' } });

  const inputs = within(container).getAllByRole('spinbutton');
  if (inputs.length > 0) fireEvent.change(inputs[0], { target: { value: '10' } });

  const calcBtn = within(container).getByRole('button', { name: /Calculate Blood Levels|calculate blood levels/i });
  fireEvent.click(calcBtn);

  await waitFor(() => expect(calc).toHaveBeenCalled());
  await waitFor(() => expect(container.querySelector('svg')).toBeTruthy());
  });

  it('covers branches: loaded substances, error handling and interactions', async () => {
    // Branch: loaded substances and chart title appears
    const getSub = vi.spyOn(api, 'getToleranceSubstances').mockResolvedValueOnce([{ id: 's1', name: 'Sub', halfLifeHours: 2 }]);
    const calc = vi.spyOn(api, 'calculateTolerance').mockResolvedValueOnce({ blood_levels: [{ time: 't', substance: 'Sub', amountMg: 5 }] });

    const { container: c1 } = render(<BloodLevelCalculator />);

    await waitFor(() => expect(within(c1).getByText('Sub')).toBeInTheDocument());

    // interact with selects and inputs (scoped)
    const select = within(c1).getByDisplayValue(/Select substance.../i) as any;
    fireEvent.change(select, { target: { value: 'Sub' } });

    const dosages = await within(c1).findAllByPlaceholderText('mg');
    const dosage = dosages[0] as HTMLInputElement;
    fireEvent.change(dosage, { target: { value: '10' } });

    const btn = within(c1).getByRole('button', { name: /calculate blood levels/i });
    fireEvent.click(btn);

    await waitFor(() => expect(within(c1).getByText(/Sub Blood Levels/)).toBeInTheDocument());

    // Branch: error handling
    (getSub as any).mockResolvedValueOnce([]);
    (calc as any).mockRejectedValueOnce(new Error('boom'));

    const { container: c2 } = render(<BloodLevelCalculator />);
    const dosages2 = await within(c2).findAllByPlaceholderText('mg');
    const dosage2 = dosages2[0] as HTMLInputElement;
    fireEvent.change(dosage2, { target: { value: '1' } });

    const btn2 = within(c2).getByRole('button', { name: /calculate blood levels/i });
    fireEvent.click(btn2);

    await waitFor(() => expect(within(c2).queryByText(/Calculation failed|Tolerance calc error|boom/i)).toBeTruthy());
  });

  it('allows adding/removing intakes and covers input handlers', async () => {
  (vi.spyOn(api, 'getToleranceSubstances') as any).mockResolvedValueOnce([]);
  (vi.spyOn(api, 'calculateTolerance') as any).mockResolvedValueOnce({ blood_levels: [] });

  const { container } = render(<BloodLevelCalculator />);

  const addBtn = within(container).getByText(/\+ Add Intake/);
  const table = within(container).getByRole('table');
  const beforeRows = within(table).getAllByRole('row').length;

  fireEvent.click(addBtn);
  const afterAddRows = within(table).getAllByRole('row').length;
  expect(afterAddRows).toBeGreaterThan(beforeRows);

  const removeBtns = within(container).getAllByText('Remove');
  expect(removeBtns.length).toBeGreaterThan(0);
  fireEvent.click(removeBtns[removeBtns.length - 1]);

  const afterRemoveRows = within(table).getAllByRole('row').length;
  expect(afterRemoveRows).toBe(beforeRows);

  const datetime = within(table).getAllByDisplayValue(() => true).find((el) => el.getAttribute('type') === 'datetime-local');
  if (datetime) fireEvent.change(datetime, { target: { value: '2025-01-01T12:00' } });

  const intakeTypeSelect = within(table).getAllByRole('combobox').find((s) => s.tagName === 'SELECT');
  if (intakeTypeSelect) fireEvent.change(intakeTypeSelect, { target: { value: 'inhaled' } });
  });
});
