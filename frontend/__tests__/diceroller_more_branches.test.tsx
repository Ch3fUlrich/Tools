// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock rollDice API
const mockRollDice = vi.fn();
vi.mock('@/lib/api/client', () => ({ rollDice: (...args: any[]) => mockRollDice(...args) }));

// Mock Boxplot and Histogram as default exports so the component can import them
vi.mock('@/components/charts/Boxplot', () => ({ default: () => <div data-testid="boxplot" /> }));
vi.mock('@/components/charts/Histogram', () => ({ default: () => <div data-testid="histogram" /> }));

// Render component
import DiceRoller from '@/components/tools/DiceRoller';

beforeEach(() => {
  mockRollDice.mockReset();
});

describe('DiceRoller extra branches', () => {
  test('allows selecting custom die and updates sides, advantage toggles, and shows charts when API returns history', async () => {
    // prepare mock return with correct DiceResponse shape (rolls array)
    mockRollDice.mockResolvedValue({
      summary: { sum: 7 },
      rolls: [
        {
          sum: 7,
          average: 7,
          perDie: [ { original: [3, 4], final: 7 } ],
          used: [7],
        },
      ],
      history: [7],
    });

    render(<DiceRoller />);

  // select custom die type by choosing the custom option in the select
  const select = screen.getByRole('combobox');
  fireEvent.change(select, { target: { value: 'custom' } });

  // sides input: use spinbutton role (number inputs). First spinbutton is Sides in the DOM
  const spinbuttons = screen.getAllByRole('spinbutton');
  const sidesInput = spinbuttons[0];
  fireEvent.change(sidesInput, { target: { value: '6' } });
  expect((sidesInput as HTMLInputElement).value).toBe('6');

  // toggle advantage: find the advantage button directly
  const advButton = screen.getByText('Advantage');
  fireEvent.click(advButton);
  // clicking again toggles off
  fireEvent.click(advButton);

    // click roll
    const rollButton = screen.getByText('Roll Dice');
    fireEvent.click(rollButton);

    // wait for mock to have been called and charts to be visible
  expect(mockRollDice).toHaveBeenCalled();
  expect(await screen.findByTestId('boxplot')).toBeInTheDocument();
  expect(await screen.findByTestId('histogram')).toBeInTheDocument();
  });
});
