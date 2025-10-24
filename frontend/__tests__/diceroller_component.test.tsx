// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';

import DiceRoller from '@/components/tools/DiceRoller';

describe('DiceRoller component', () => {
  test('renders title and Roll button', () => {
    render(<DiceRoller />);
    expect(screen.getByText('Dice Roller')).toBeInTheDocument();
    // Use aria-label to uniquely identify the Roll button (avoids matching Reroll Low)
    expect(screen.getByLabelText('Roll dice')).toBeInTheDocument();
  });
});
