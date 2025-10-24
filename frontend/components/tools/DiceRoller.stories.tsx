import React from 'react';
import { DiceRoller } from './DiceRoller';

const meta = {
  title: 'Tools/DiceRoller',
  component: DiceRoller,
};

export default meta;

export const Default = () => <div style={{padding:20}}><DiceRoller /></div>;
