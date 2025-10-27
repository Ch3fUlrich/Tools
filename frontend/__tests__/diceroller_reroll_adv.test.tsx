/// <reference types="vitest" />
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import DiceRoller from '@/components/tools/DiceRoller';
import { vi } from 'vitest';

vi.mock('@/lib/api/client', async () => ({
  rollDice: vi.fn(),
}));

describe('DiceRoller reroll and numeric modifier', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('applies reroll when enabled and changes final die value', async () => {
    const { rollDice } = await import('@/lib/api/client');

    // initial API returns a single die with final=1 which should trigger reroll when threshold=4
    (rollDice as any).mockResolvedValueOnce({
      rolls: [{ sum: 1, average: 1, perDie: [{ original: [1], final: 1 }], used: [1] }],
      summary: { totalRollsRequested: 1 }
    });

    // Mock Math.random to return a large value so rerolled value becomes 6 for a d6
    const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    render(<DiceRoller />);

    // enable reroll
    const rerollCheckbox = screen.getByLabelText('Enabled');
    fireEvent.click(rerollCheckbox);

    // set reroll threshold value to 4
    const rerollValueInput = screen.getByPlaceholderText('value');
    fireEvent.change(rerollValueInput, { target: { value: '4' } });

    // click roll
    fireEvent.click(screen.getByRole('button', { name: /Roll Dice/ }));

  // wait for result and assert that the final value shown in the Dice Results table is 6
  await waitFor(() => expect(screen.getByText(/Latest Roll Results/)).toBeInTheDocument());
  // locate the Dice Results table for the latest roll and check the first die's Final cell
  const diceResultsHeading = screen.getByText('Dice Results');
  const diceResultsContainer = diceResultsHeading.closest('div');
  expect(diceResultsContainer).toBeTruthy();
  const table = within(diceResultsContainer as HTMLElement).getByRole('table');
  const rows = within(table).getAllByRole('row');
  // rows[0] is header, rows[1] is first data row for die #1
  const firstDataRow = rows[1];
  // the Final value is rendered in the last cell of the row
  const cells = within(firstDataRow).getAllByRole('cell');
  const finalCell = cells[cells.length - 1];
  expect(within(finalCell).getByText('6')).toBeInTheDocument();

    mathSpy.mockRestore();
  });
});
