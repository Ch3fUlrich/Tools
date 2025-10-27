// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock rollDice API
const mockRoll = vi.fn();
vi.mock('@/lib/api/client', () => ({ rollDice: (...args: any[]) => mockRoll(...args) }));

import DiceRoller from '@/components/tools/DiceRoller';

describe('DiceRoller UI interactions (additional coverage)', () => {
  beforeEach(() => {
    mockRoll.mockReset();
  });

  it('adds and removes a dice configuration using add/remove controls', () => {
    render(<DiceRoller />);

  // initially there are no remove buttons (only one default config)
  expect(screen.queryAllByLabelText(/Remove dice config/i).length).toBe(0);

  // add a D20 config
  const addD20 = screen.getByRole('button', { name: /Add D20/i });
  fireEvent.click(addD20);

  // now there should be at least one remove button (we added a second config)
  let removes = screen.getAllByLabelText(/Remove dice config/i);
  expect(removes.length).toBeGreaterThan(0);

  // click the last remove button (remove the added config)
  fireEvent.click(removes[removes.length - 1]);

  // after removal, remove buttons should be back to zero (only default config remains)
  removes = screen.queryAllByLabelText(/Remove dice config/i);
  expect(removes.length).toBe(0);
  });

  it('shows reroll controls when enabling reroll and allows operator/value interactions', () => {
    render(<DiceRoller />);

    // enable reroll for the first config via the checkbox with aria-label 'Enabled'
    const enabledCheckbox = screen.getByLabelText('Enabled');
    fireEvent.click(enabledCheckbox);

    // now the reroll operator buttons and value input should be visible
    const valueInput = screen.getByPlaceholderText('value');
    expect(valueInput).toBeInTheDocument();

    // operator button '=' should exist within the reroll controls
    const opEq = screen.getByRole('button', { name: '=' });
    expect(opEq).toBeInTheDocument();
    fireEvent.click(opEq);
  });

  it('hides charts when Show Charts is unchecked and still records roll results', async () => {
    // mock a simple roll response
    mockRoll.mockResolvedValueOnce({ summary: { totalRollsRequested: 1 }, rolls: [ { sum: 4, average: 4, perDie: [{ original: [4], final: 4 }], used: [4] } ] });

    render(<DiceRoller />);

    // uncheck show charts
    const showCharts = screen.getByLabelText('Show Charts');
    // it's checked by default; toggle it off
    fireEvent.click(showCharts);

    // click Roll button
    const rollBtn = screen.getByRole('button', { name: /Roll Dice/i });
    fireEvent.click(rollBtn);

    // wait for the mocked roll to populate the results by asserting the Latest Roll Results header appears
    const latest = await screen.findByText(/Latest Roll Results/i);
    expect(latest).toBeInTheDocument();

  // charts should NOT be present when toggled off — look for the Charts heading specifically
  const chartsHeading = screen.queryByRole('heading', { name: /Charts/i });
  expect(chartsHeading).toBeNull();
  });
});
