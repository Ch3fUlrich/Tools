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

describe('DiceRoller extra branches (>) and disadvantage', () => {
  it("handles reroll '>' operator by retrying until value no longer matches condition", async () => {
    // API returns final 6 which is > 5 and should trigger reroll
    mockRollDice.mockResolvedValueOnce({ summary: { totalRollsRequested: 1 }, rolls: [ { sum: 6, average: 6, perDie: [{ original: [6], final: 6 }], used: [6] } ] });

    // Mock Math.random to return a small value so rerolled value becomes 2 for a d6
    const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0.2);

    render(<DiceRoller />);

    // enable reroll for the initial row
    const checkboxes = screen.getAllByLabelText('Enabled');
    fireEvent.click(checkboxes[0]);

    // choose '>' operator
    const gtButton = screen.getByRole('button', { name: '>' });
    fireEvent.click(gtButton);

    // set reroll value to 5
    const valueInputs = screen.getAllByPlaceholderText('value');
    fireEvent.change(valueInputs[0], { target: { value: '5' } });

    // click Roll
    fireEvent.click(screen.getByRole('button', { name: /Roll Dice/i }));

    // await results and verify final changed from 6 -> rerolled 2
    await waitFor(() => expect(screen.getByText(/Latest Roll Results/)).toBeInTheDocument());

    const diceResultsHeading = screen.getByText('Dice Results');
    const diceResultsContainer = diceResultsHeading.closest('div')!;
    const table = within(diceResultsContainer).getByRole('table');
    const rows = within(table).getAllByRole('row');
    const firstDataRow = rows[1];
    const cells = within(firstDataRow).getAllByRole('cell');
    const finalCell = cells[cells.length - 1];

    expect(within(finalCell).getByText('2')).toBeInTheDocument();

    mathSpy.mockRestore();
  });

  it('applies numericModifier when disadvantage is active (dis decreases by modifier)', async () => {
    // API returns a die with final 8
    mockRollDice.mockResolvedValueOnce({ summary: { totalRollsRequested: 1 }, rolls: [ { sum: 8, average: 8, perDie: [{ original: [8], final: 8 }], used: [8] } ] });

    render(<DiceRoller />);

    // enable disadvantage
    const disBtn = screen.getByText('Dis');
    fireEvent.click(disBtn);

    // increase numeric modifier twice to make it 2
    const configTable = screen.getByRole('table');
    const configRows = within(configTable).getAllByRole('row');
    const firstConfigRow = configRows[1];
    const increaseButtons = firstConfigRow.querySelectorAll('button[aria-label="Increase value"]');
    expect(increaseButtons.length).toBeGreaterThan(0);
    const inc = increaseButtons[0] as HTMLElement;
    fireEvent.click(inc);
    fireEvent.click(inc);

    // click Roll
    fireEvent.click(screen.getByRole('button', { name: /Roll Dice/i }));

    // expect final = 8 - 2 = 6
    await waitFor(() => expect(screen.getByText(/Latest Roll Results/)).toBeInTheDocument());
    const diceResultsHeading = screen.getByText('Dice Results');
    const diceResultsContainer = diceResultsHeading.closest('div')!;
    const table = within(diceResultsContainer).getByRole('table');
    const rows = within(table).getAllByRole('row');
    const firstDataRow = rows[1];
    const cells = within(firstDataRow).getAllByRole('cell');
    const finalCell = cells[cells.length - 1];

    expect(within(finalCell).getByText('6')).toBeInTheDocument();
  });
});


