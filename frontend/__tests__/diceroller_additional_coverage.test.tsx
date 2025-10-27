// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';

// Mock rollDice API
const mockRollDice = vi.fn();
vi.mock('@/lib/api/client', () => ({ rollDice: (...args: any[]) => mockRollDice(...args) }));

// Mock charts used inside DiceRoller so rendering is fast and predictable
vi.mock('@/components/charts/Boxplot', () => ({ default: () => <div data-testid="boxplot" /> }));
vi.mock('@/components/charts/Histogram', () => ({ default: () => <div data-testid="histogram" /> }));

import DiceRoller from '@/components/tools/DiceRoller';

beforeEach(() => {
  mockRollDice.mockReset();
  vi.restoreAllMocks();
});

describe('DiceRoller targeted branches for coverage', () => {
  it("handles reroll '=' operator by retrying until value differs from target", async () => {
    // API returns a die with final === 2 (which will match rerollValue)
    mockRollDice.mockResolvedValueOnce({
      summary: { totalRollsRequested: 1 },
      rolls: [ { sum: 2, average: 2, perDie: [{ original: [2], final: 2 }], used: [2] } ]
    });

    // Mock Math.random so a reroll produces value 5 for a d6
    const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0.8);

    render(<DiceRoller />);

    // enable reroll for the initial row (first checkbox labeled 'Enabled')
    const checkboxes = screen.getAllByLabelText('Enabled');
    expect(checkboxes.length).toBeGreaterThan(0);
    fireEvent.click(checkboxes[0]);

    // choose '=' operator (should appear when reroll enabled)
    const eqButton = screen.getByRole('button', { name: '=' });
    fireEvent.click(eqButton);

    // set reroll value input (placeholder 'value') - pick first occurrence
    const valueInputs = screen.getAllByPlaceholderText('value');
    fireEvent.change(valueInputs[0], { target: { value: '2' } });

    // click Roll
    fireEvent.click(screen.getByRole('button', { name: /Roll Dice/i }));

    // wait for results and verify final value changed from 2 to expected rerolled+modifier (5)
    await waitFor(() => expect(screen.getByText(/Latest Roll Results/)).toBeInTheDocument());

    const diceResultsHeading = screen.getByText('Dice Results');
    const diceResultsContainer = diceResultsHeading.closest('div')!;
    const table = within(diceResultsContainer).getByRole('table');
    const rows = within(table).getAllByRole('row');
    const firstDataRow = rows[1];
    const cells = within(firstDataRow).getAllByRole('cell');
    const finalCell = cells[cells.length - 1];

    expect(within(finalCell).getByText('5')).toBeInTheDocument();

    mathSpy.mockRestore();
  });

  it('applies numericModifier when advantage is active (adv increases by modifier)', async () => {
    // API returns a die with final 3
    mockRollDice.mockResolvedValueOnce({
      summary: { totalRollsRequested: 1 },
      rolls: [ { sum: 3, average: 3, perDie: [{ original: [3], final: 3 }], used: [3] } ]
    });

    render(<DiceRoller />);

    // find the advantage button (text 'Adv') and click to enable advantage
    const advBtn = screen.getByText('Adv');
    fireEvent.click(advBtn);

  // set numeric modifier input: find the first config row and update its number input for numericModifier
  const configTable = screen.getByRole('table');
  const configRows = within(configTable).getAllByRole('row');
  // header row + at least one data row
  expect(configRows.length).toBeGreaterThan(1);
  const firstConfigRow = configRows[1];
  // find the first number input inside this row (numericModifier input for default d6)
  const increaseButtons = firstConfigRow.querySelectorAll('button[aria-label="Increase value"]');
  expect(increaseButtons.length).toBeGreaterThan(0);
  const inc = increaseButtons[0] as HTMLElement;
  // click twice to raise default 0 -> 2
  fireEvent.click(inc);
  fireEvent.click(inc);

    // click Roll
    fireEvent.click(screen.getByRole('button', { name: /Roll Dice/i }));

    // wait for results and assert the final value increased by +2 (3 -> 5)
    await waitFor(() => expect(screen.getByText(/Latest Roll Results/)).toBeInTheDocument());

    const diceResultsHeading = screen.getByText('Dice Results');
    const diceResultsContainer = diceResultsHeading.closest('div')!;
    const table = within(diceResultsContainer).getByRole('table');
    const rows = within(table).getAllByRole('row');
    const firstDataRow = rows[1];
    const cells = within(firstDataRow).getAllByRole('cell');
    const finalCell = cells[cells.length - 1];

    expect(within(finalCell).getByText('5')).toBeInTheDocument();
  });
});
