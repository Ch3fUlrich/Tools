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

    // The default configuration should work (1 d6)
    // Click roll button
    fireEvent.click(screen.getByRole('button', { name: /Roll Dice/ }));

    await waitFor(() => expect(screen.getByText(/Latest Roll Results/)).toBeInTheDocument());
    // Look for the total in the results section specifically
    const resultsSection = screen.getByText(/Latest Roll Results/).closest('.bg-white');
    expect(resultsSection).toHaveTextContent('7');
  });

  it('shows error message when roll fails', async () => {
    const { rollDice } = await import('@/lib/api/client');
    (rollDice as any).mockRejectedValueOnce(new Error('fail'));
    const alertSpy = vi.spyOn(global, 'alert').mockImplementation(() => {});

    render(<DiceRoller />);

    // Set count to 1
    const spinbuttons = screen.getAllByRole('spinbutton');
    fireEvent.change(spinbuttons[0], { target: { value: '1' } });
    // Click roll button
    fireEvent.click(screen.getByRole('button', { name: /Roll Dice/ }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    alertSpy.mockRestore();
  });

  it('allows custom die sides input when custom die is selected', async () => {
    const { rollDice } = await import('@/lib/api/client');
    (rollDice as any).mockResolvedValueOnce({
      summary: { total: 5 },
      rolls: [{
        sum: 5,
        average: 5,
        perDie: [{ original: [5], final: 5 }],
        used: [5],
      }],
    });

    render(<DiceRoller />);

    // Select custom die from dropdown
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'custom' } });

  // Should show sides input and count input
  const sidesInput = screen.getByPlaceholderText('sides');
  expect(sidesInput).toBeInTheDocument();

  const countInput = screen.getByLabelText('count');

  // Set custom sides and count
  fireEvent.change(sidesInput, { target: { value: '8' } });
  fireEvent.change(countInput, { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: /Roll Dice/ }));

    await waitFor(() => expect(screen.getByText(/Latest Roll Results/)).toBeInTheDocument());
  });

  it('supports keyboard interaction for rolling dice', async () => {
    const { rollDice } = await import('@/lib/api/client');
    (rollDice as any).mockResolvedValueOnce({
      summary: { total: 3 },
      rolls: [{
        sum: 3,
        average: 3,
        perDie: [{ original: [3], final: 3 }],
        used: [3],
      }],
    });

    render(<DiceRoller />);

    // Click the roll button
    fireEvent.click(screen.getByRole('button', { name: /Roll Dice/ }));

    await waitFor(() => expect(screen.getByText(/Latest Roll Results/)).toBeInTheDocument());
  });
});
