// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
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
vi.mock('@/lib/api/client', () => ({ rollDice: (...args: any[]) => mockRollDice(...args) }));

// Mock charts
vi.mock('@/components/charts/Boxplot', () => ({ default: () => <div data-testid="boxplot" /> }));
vi.mock('@/components/charts/Histogram', () => ({ default: () => <div data-testid="histogram" /> }));

import DiceRoller from '@/components/tools/DiceRoller';

describe('DiceRoller lastResult mapping branches', () => {
  test('renders multiple roll entries and per-die rows', async () => {
    render(<DiceRoller />);
    // click Roll button to cause mockRollDice to populate lastResult
    const rollButton = screen.getByLabelText(/Roll dice/);
    rollButton.click();

    // expect per-die entries from first roll
    expect(await screen.findByText(/Roll 1/)).toBeInTheDocument();
    expect(screen.getByText(/1/)).toBeInTheDocument(); // first die index in table
    expect(await screen.findByTestId('boxplot')).toBeInTheDocument();
    expect(await screen.findByTestId('histogram')).toBeInTheDocument();
  });
});
