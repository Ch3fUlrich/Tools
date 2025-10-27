import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/api/client', () => ({
  rollDice: vi.fn(),
}));

import { rollDice } from '../lib/api/client';
import DiceRoller from '../components/tools/DiceRoller';

describe('DiceRoller branches', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows alert on roll failure', async () => {
    (rollDice as any).mockRejectedValueOnce(new Error('fail'));
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<DiceRoller />);
    const btn = screen.getByRole('button', { name: /roll dice/i });
    fireEvent.click(btn);

    await waitFor(() => expect((rollDice as any)).toHaveBeenCalled());
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Roll failed'));
  });

  it('handles custom die and renders results and charts', async () => {
    // mock rollDice to return a structure with rolls and perDie data
    (rollDice as any).mockResolvedValue({ rolls: [{ sum: 7, average: 3.5, perDie: [{ original: [3,4], final: 4 }], used: [3,4] }] });

    render(<DiceRoller />);

    // add a new dice config and switch it to custom
  // use the new D6 quick-add button
  const addBtn = screen.getByRole('button', { name: /Add D6/i });
  fireEvent.click(addBtn);

    // find the last die type select (there will be two selects)
    const selects = screen.getAllByRole('combobox');
    const lastSelect = selects[selects.length - 1];
    fireEvent.change(lastSelect, { target: { value: 'custom' } });

    // set sides input for custom die (NumberInput with placeholder 'sides')
    const sidesInput = screen.getByPlaceholderText('sides');
    fireEvent.change(sidesInput, { target: { value: '10' } });

    // click roll
    const rollBtn = screen.getByRole('button', { name: /roll dice/i });
    fireEvent.click(rollBtn);

    // wait for result card
    await waitFor(() => expect(screen.getByText(/Latest Roll Results/)).toBeInTheDocument());
    // check that charts (Boxplot/Histogram) placeholders render as SVGs or by text
    expect(screen.getAllByText(/Dice Results/).length).toBeGreaterThan(0);
  });
});
