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

describe('DiceRoller targeted branches', () => {
  it("applies reroll '=' operator and changes final die value via Math.random", async () => {
    // API returns a single die with final = 1 which matches reroll target
    mockRollDice.mockResolvedValueOnce({ summary: { totalRollsRequested: 1 }, rolls: [ { sum: 1, average: 1, perDie: [{ original: [1], final: 1 }], used: [1] } ] });

    // stub Math.random so a reroll produces predictable value: Math.floor(0.5*6)+1 === 4
    vi.spyOn(Math, 'random').mockReturnValue(0.5 as any);

    render(<DiceRoller />);

    // enable reroll for the initial config (there is a checkbox labelled 'Enabled')
    const enabled = screen.getAllByLabelText('Enabled')[0];
    fireEvent.click(enabled);

    // pick '=' operator
    const eqBtn = screen.getByRole('button', { name: '=' });
    fireEvent.click(eqBtn);

    // set reroll value to 1
    const rerollInput = screen.getByPlaceholderText('value');
    fireEvent.change(rerollInput, { target: { value: '1' } });

    // perform roll
    fireEvent.click(screen.getByRole('button', { name: /Roll Dice/i }));

    // wait for results and assert the final displayed value reflects the reroll outcome (4)
    await waitFor(() => expect(screen.getByText('Latest Roll Results')).toBeInTheDocument());
    // final value '4' should be present in the results table
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
  });

  it('applies numericModifier when advantage is set (adv adds modifier)', async () => {
    // API returns a single die with final = 3
    mockRollDice.mockResolvedValueOnce({ summary: { totalRollsRequested: 1 }, rolls: [ { sum: 3, average: 3, perDie: [{ original: [3], final: 3 }], used: [3] } ] });

    render(<DiceRoller />);

  // click Adv button for the first config (visible label is 'Adv')
  const advBtn = screen.getByText('Adv');
  fireEvent.click(advBtn);

  // numeric modifier input should appear; find the spinbutton that is NOT the 'count' input
  const spinbuttons = screen.getAllByRole('spinbutton');
  const modifierInput = spinbuttons.find((el) => (el.getAttribute('aria-label') || '') !== 'count');
  // modifierInput will be the NumberInput for the advantage modifier; change it to 2
  if (modifierInput) fireEvent.change(modifierInput, { target: { value: '2' } });

    // perform roll
    fireEvent.click(screen.getByRole('button', { name: /Roll Dice/i }));

    // wait for results and assert final is original + 2 = 5
    await waitFor(() => expect(screen.getByText('Latest Roll Results')).toBeInTheDocument());
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
  });
});
