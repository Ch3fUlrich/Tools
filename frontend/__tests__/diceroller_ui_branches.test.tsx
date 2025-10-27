import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock rollDice and charts to keep tests focused on UI branches
const mockRoll = vi.fn().mockResolvedValue({
  rolls: [
    { sum: 5, average: 2.5, perDie: [{ original: [2,3], final: 3 }], used: [3] }
  ],
  summary: { totalRollsRequested: 1 }
});
vi.mock('@/lib/api/client', () => ({ rollDice: (...args: any[]) => mockRoll(...args) }));
vi.mock('@/components/charts/Boxplot', () => ({ default: () => <div data-testid="boxplot" /> }));
vi.mock('@/components/charts/Histogram', () => ({ default: () => <div data-testid="histogram" /> }));

import DiceRoller from '@/components/tools/DiceRoller';

describe('DiceRoller UI branches', () => {
  it('adds and removes dice configuration rows', () => {
    render(<DiceRoller />);
    // initial select exists
    const selectsBefore = document.querySelectorAll('select');
    expect(selectsBefore.length).toBe(1);

  // click add (use the new D6 quick-add button)
  fireEvent.click(screen.getByRole('button', { name: /Add D6/i }));
    const selectsAfterAdd = document.querySelectorAll('select');
    expect(selectsAfterAdd.length).toBe(2);

    // remove the second row (Remove button appears only when >1)
    const removeButtons = screen.getAllByText(/Remove/i);
    expect(removeButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(removeButtons[0]);
    const selectsAfterRemove = document.querySelectorAll('select');
    expect(selectsAfterRemove.length).toBe(1);
  });

  it('switches die type to custom and updates sides input', () => {
    render(<DiceRoller />);
  const select = document.querySelector('select')!;
    // switch to custom
    fireEvent.change(select, { target: { value: 'custom' } });

    // NumberInput for sides should appear (placeholder 'sides')
    const sidesInput = screen.getByPlaceholderText(/sides/i) as HTMLInputElement;
    expect(sidesInput).toBeTruthy();

    fireEvent.change(sidesInput, { target: { value: '12' } });
    expect(sidesInput.value).toBe('12');
  });
});
