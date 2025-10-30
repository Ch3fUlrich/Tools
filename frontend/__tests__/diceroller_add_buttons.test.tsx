// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

// Mock rollDice API (not needed for this test but keep shape)
const mockRollDice = vi.fn();
vi.mock('@/lib/api/client', () => ({ rollDice: (...args: any[]) => mockRollDice(...args) }));

// Mock charts used inside DiceRoller so rendering is fast and predictable
vi.mock('@/components/charts/Boxplot', () => ({ default: () => <div data-testid="boxplot" /> }));
vi.mock('@/components/charts/Histogram', () => ({ default: () => <div data-testid="histogram" /> }));

import DiceRoller from '@/components/tools/DiceRoller';

describe('DiceRoller add buttons coverage', () => {
  it('renders and clicks all add-die buttons to exercise addDiceConfigWithType branches', async () => {
    render(<DiceRoller />);

    const addLabels = ['Add D2','Add D3','Add D4','Add D6','Add D8','Add D10','Add D12','Add D20','Add Custom'];

    const configTable = screen.getByRole('table');
    const beforeRows = within(configTable).getAllByRole('row').length;

    // Click all buttons with small delays to prevent cascading re-renders
    for (const label of addLabels) {
      const btn = screen.getByRole('button', { name: label });
      fireEvent.click(btn);
      // Small delay to allow React to process the state update
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    // Check final result - should have added all configs
    const afterRows = within(configTable).getAllByRole('row').length;
    expect(afterRows).toBeGreaterThanOrEqual(beforeRows + addLabels.length);
  });
});
