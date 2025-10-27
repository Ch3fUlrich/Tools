import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock rollDice API
vi.mock('@/lib/api/client', async () => {
  const actual = await import('../lib/api/client');
  return {
    ...actual,
    rollDice: vi.fn().mockResolvedValue({
      rolls: [
        {
          perDie: [{ original: [4], final: 4 }],
          used: [4],
          sum: 4,
          average: 4,
          median: 4,
          spread: 0,
        }
      ],
      summary: { totalRollsRequested: 1 }
    })
  };
});

import DiceRoller from '@/components/tools/DiceRoller';
import * as api from '@/lib/api/client';

describe('DiceRoller extra flows', () => {
  it('allows switching to custom sides and performs a roll', async () => {
    const rollSpy = vi.spyOn(api, 'rollDice');
    render(<DiceRoller />);

    // Change die type select to custom
    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: 'custom' } });

    // There should be a number input for sides
    const sideInput = screen.getByPlaceholderText('sides');
    fireEvent.change(sideInput, { target: { value: '10' } });

    // Click Roll Dice
    const rollBtn = screen.getByRole('button', { name: /Roll Dice/i });
    fireEvent.click(rollBtn);

    await waitFor(() => expect(rollSpy).toHaveBeenCalled());

    // After roll, expect Latest Roll Results heading to show
    await waitFor(() => expect(screen.getByText(/Latest Roll Results/i)).toBeInTheDocument());
  });
});
