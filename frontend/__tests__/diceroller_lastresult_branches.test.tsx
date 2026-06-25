// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

// Mock rollDice API to return multiple rolls
const mockRollDice = vi.fn().mockResolvedValue({
  summary: { sum: 15 },
  rolls: [
    {
      sum: 8,
      average: 4,
      perDie: [ { original: [3,1], final: 4 }, { original: [4], final: 4 } ],
      used: [4,4],
    },
    {
      sum: 7,
      average: 3.5,
      perDie: [ { original: [2,1], final: 3 }, { original: [4], final: 4 } ],
      used: [3,4],
    }
  ],
  history: [8,7]
});
vi.mock('@/lib/api/client', () => ({
  rollDice: (...args: any[]) => mockRollDice(...args),
  getDiceHistory: vi.fn().mockResolvedValue([]),
  saveDiceRoll: vi.fn().mockResolvedValue({})
}));

// Mock charts
vi.mock('@/components/charts/Boxplot', () => ({ default: () => <div data-testid="boxplot" /> }));
vi.mock('@/components/charts/Histogram', () => ({ default: () => <div data-testid="histogram" /> }));

import DiceRoller from '@/components/tools/DiceRoller';

describe('DiceRoller lastResult mapping branches', () => {
  test('renders multiple roll entries and per-die rows', async () => {
    await act(async () => {
      render(<DiceRoller />);
      await new Promise(r => setTimeout(r, 50));
    });

    // enable charts before rolling
    const showChartsCheckbox = screen.getByLabelText('Show Charts');
    await act(async () => { fireEvent.click(showChartsCheckbox); await new Promise(r => setTimeout(r, 10)); });

    // click Roll button to cause mockRollDice to populate lastResult
    const rollButton = screen.getByText('Roll Dice');
    await act(async () => { rollButton.click(); await new Promise(r => setTimeout(r, 50)); });

  // expect Dice Results heading and per-die reroll sequence text
  expect(await screen.findByText(/Dice Results/)).toBeInTheDocument();
  expect(await screen.findByText(/Latest Roll Results/)).toBeInTheDocument();
  const boxplots = await screen.findAllByTestId('boxplot');
  const hists = await screen.findAllByTestId('histogram');
  expect(boxplots.length).toBeGreaterThanOrEqual(2);
  expect(hists.length).toBeGreaterThanOrEqual(2);
  // check reroll sequence appears (original: [3,1] → shown as "3 → 1")
  expect(screen.getByText(/3 → 1/)).toBeInTheDocument();
  // Wait for initial history fetch to complete so we don't leak state updates
  const api = await import('@/lib/api/client');
  await waitFor(() => expect(api.getDiceHistory).toHaveBeenCalled());
  });
});
