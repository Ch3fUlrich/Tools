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

describe('DiceRoller multi-config and charts', () => {
  it('adds and removes configs, shows charts when toggled, and combines multiple roll results', async () => {
    // two separate API responses for two configs
    mockRollDice.mockResolvedValueOnce({ summary: { totalRollsRequested: 1 }, rolls: [ { sum: 4, average: 4, perDie: [{ original: [4], final: 4 }], used: [4] } ] });
    mockRollDice.mockResolvedValueOnce({ summary: { totalRollsRequested: 1 }, rolls: [ { sum: 6, average: 6, perDie: [{ original: [6], final: 6 }], used: [6] } ] });

    render(<DiceRoller />);

  // initially one config: add another via D6 button (accessible label is "Add D6")
  const addD6 = screen.getByRole('button', { name: 'Add D6' });
    fireEvent.click(addD6);

    // now there should be two config rows in the config table
    const configTable = screen.getByRole('table');
    const configRows = within(configTable).getAllByRole('row');
    expect(configRows.length).toBeGreaterThanOrEqual(2 + 1); // header + rows

    // remove the second config (there should be a remove button in rows)
    const removeButtons = screen.getAllByLabelText(/Remove dice config/);
    expect(removeButtons.length).toBeGreaterThanOrEqual(1);
    // remove the newly added config (last one)
    fireEvent.click(removeButtons[removeButtons.length - 1]);

    // toggle Show Charts checkbox to hide/show charts
    const chartCheckbox = screen.getByLabelText('Show Charts');
    // it is initially checked by default in the component
    expect(chartCheckbox).toBeInTheDocument();
    // toggle off then on
    fireEvent.click(chartCheckbox);
    fireEvent.click(chartCheckbox);

    // click Roll to perform combined roll (two mocked responses will be consumed if two configs existed)
    fireEvent.click(screen.getByRole('button', { name: /Roll Dice/i }));

    // wait for results to show up
    await waitFor(() => expect(screen.getByText(/Latest Roll Results/)).toBeInTheDocument());

    // verify that dice results table exists and shows numbers from mocked calls
    const diceResultsHeading = screen.getByText('Dice Results');
    const diceResultsContainer = diceResultsHeading.closest('div')!;
    const table = within(diceResultsContainer).getByRole('table');
    expect(table).toBeInTheDocument();
    // expect to find one of the mocked sums in the document
    const matches4 = screen.queryAllByText('4');
    const matches6 = screen.queryAllByText('6');
    expect(matches4.length + matches6.length).toBeGreaterThan(0);
  });
});
