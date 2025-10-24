/// <reference types="vitest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DiceRoller from '@/components/tools/DiceRoller';
import { vi } from 'vitest';

vi.mock('@/lib/api/client', async () => ({
  rollDice: vi.fn(),
}));

describe('DiceRoller', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('displays roll results when API call succeeds', async () => {
    const { rollDice } = await import('@/lib/api/client');
    (rollDice as any).mockResolvedValueOnce({
      summary: { total: 7 },
      rolls: [
        {
          sum: 7,
          average: 3.5,
          perDie: [{ original: [3,4], final: 4 }],
          used: [3,4],
        },
      ],
    });

    render(<DiceRoller />);

  // Use roles: die is a combobox, count/sides are spinbuttons
  const dieSelect = screen.getByRole('combobox');
  fireEvent.change(dieSelect, { target: { value: 'custom' } });
  const spinbuttons = screen.getAllByRole('spinbutton');
  // when custom is selected, order is: Sides, Count
  fireEvent.change(spinbuttons[0], { target: { value: '6' } });
  fireEvent.change(spinbuttons[1], { target: { value: '2' } });
  fireEvent.click(screen.getByLabelText(/Roll dice/i));

    await waitFor(() => expect(screen.getByText(/Sum:/)).toBeInTheDocument());
    // match the sum together with the label to avoid ambiguous numeric matches elsewhere
    expect(screen.getByText(/Sum:\s*7/)).toBeInTheDocument();
  });

  it('shows error message when roll fails', async () => {
    const { rollDice } = await import('@/lib/api/client');
  (rollDice as any).mockRejectedValueOnce(new Error('fail'));
  const alertSpy = vi.spyOn(global, 'alert').mockImplementation(() => {});

    render(<DiceRoller />);

    const spinbuttons2 = screen.getAllByRole('spinbutton');
    // default when not custom: only one spinbutton (Count) may be present; ensure we set it
    if (spinbuttons2.length === 1) {
      fireEvent.change(spinbuttons2[0], { target: { value: '1' } });
    } else {
      // if custom shown, second is count
      fireEvent.change(spinbuttons2[1], { target: { value: '1' } });
    }
  fireEvent.click(screen.getByLabelText(/Roll dice/i));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    alertSpy.mockRestore();
  });
});
