import React from 'react';
import { render, screen } from '@testing-library/react';

import { Default } from '../components/tools/DiceRoller.stories';

test('DiceRoller stories render without error', () => {
  render(<Default />);
  expect(screen.getByText('Dice Roller')).toBeInTheDocument();
});