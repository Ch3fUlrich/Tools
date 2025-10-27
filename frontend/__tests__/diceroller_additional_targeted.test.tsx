// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';

// Mock rollDice API
const mockRollDice = vi.fn();
vi.mock('@/lib/api/client', () => ({ rollDice: (...args: any[]) => mockRollDice(...args) }));

// Keep charts lightweight
vi.mock('@/components/charts/Boxplot', () => ({ default: () => <div data-testid="boxplot" /> }));
vi.mock('@/components/charts/Histogram', () => ({ default: () => <div data-testid="histogram" /> }));

import DiceRoller from '@/components/tools/DiceRoller';

beforeEach(() => {
  mockRollDice.mockReset();
  vi.restoreAllMocks();
});

describe('DiceRoller additional targeted branches', () => {
  it('applies per-config mapping for multiple configs and recalculates summary when second config modifies a die', async () => {
    // API: first call returns a single roll with two perDie entries (so idx 0/1 map to cfg 0/1)
    mockRollDice.mockResolvedValueOnce({ summary: { totalRollsRequested: 1 }, rolls: [ { sum: 5, average: 2.5, perDie: [{ original: [2], final: 2 }, { original: [3], final: 3 }], used: [2,3] } ] });
    // second API call (for the second config) should also resolve to a valid shape (can be empty)
    mockRollDice.mockResolvedValueOnce({ summary: { totalRollsRequested: 1 }, rolls: [ { sum: 0, average: 0, perDie: [], used: [] } ] });

    render(<DiceRoller />);

    // add a second configuration (Add D6)
    const addButtons = screen.getAllByRole('button', { name: /Add D6|Add D2|Add D3|Add D4|Add D6|Add D8|Add D10|Add D12|Add D20|Add Custom/i });
    // prefer the explicit Add D6 if present, otherwise click the first add button
    const addD6 = addButtons.find(b => /Add D6/i.test(b.getAttribute('aria-label') || '')) || addButtons[0];
    fireEvent.click(addD6);

    // enable Advantage on the second config (there will be two 'Adv' buttons)
    const advButtons = screen.getAllByText('Adv');
    expect(advButtons.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(advButtons[1]);

    // set numeric modifier for the second config to 2
    const spinbuttons = screen.getAllByRole('spinbutton');
    // filter out the count inputs (they have aria-label 'count')
    const modifierInputs = spinbuttons.filter((el) => (el.getAttribute('aria-label') || '') !== 'count');
    // choose the last modifier input which corresponds to the second config
    const secondModifier = modifierInputs[modifierInputs.length - 1];
    if (secondModifier) fireEvent.change(secondModifier, { target: { value: '2' } });

    // perform roll
    fireEvent.click(screen.getByRole('button', { name: /Roll Dice/i }));

    // wait for results and assert the recalculated total: original 2 + (3 + 2) = 7
    await waitFor(() => expect(screen.getByText('Latest Roll Results')).toBeInTheDocument());
    expect(screen.getAllByText('7').length).toBeGreaterThan(0);
  });

  it('handles reroll with "<" operator and numeric guard paths (reroll only when value condition met)', async () => {
    // API returns a single die with final = 1 which is < 2 (should trigger reroll)
    mockRollDice.mockResolvedValueOnce({ summary: { totalRollsRequested: 1 }, rolls: [ { sum: 1, average: 1, perDie: [{ original: [1], final: 1 }], used: [1] } ] });

    // stub Math.random so a reroll produces predictable value: Math.floor(0.6*6)+1 === 4
    vi.spyOn(Math, 'random').mockReturnValue(0.6 as any);

    render(<DiceRoller />);

    // enable reroll for the initial config
    const enabled = screen.getAllByLabelText('Enabled')[0];
    fireEvent.click(enabled);

    // pick '<' operator (default might already be '<', but click to ensure)
    const ltBtn = screen.getByRole('button', { name: '<' });
    fireEvent.click(ltBtn);

    // set reroll value to 2 (so 1 < 2 triggers reroll)
    const rerollInput = screen.getByPlaceholderText('value');
    fireEvent.change(rerollInput, { target: { value: '2' } });

    // perform roll
    fireEvent.click(screen.getByRole('button', { name: /Roll Dice/i }));

    // wait for results and assert the final displayed value reflects the reroll outcome (4)
    await waitFor(() => expect(screen.getByText('Latest Roll Results')).toBeInTheDocument());
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
  });
});
