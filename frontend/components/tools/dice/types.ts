export type PerDie = {
  original: number[];
  final: number;
};

export type RollDetail = {
  sum: number;
  average: number;
  perDie: PerDie[];
  used: number[];
  rerollCount?: number;
  rerollConfig?: string;
  rawSum?: number;       // sum of dice before modifier
  totalModifier?: number; // flat group modifier (+/-)
};

export type DieOption = 'd2'|'d3'|'d4'|'d6'|'d8'|'d10'|'d12'|'d20'|'custom';

export type DiceConfig = {
  id: string;
  dieType: DieOption;
  sides: number;
  count: number;
  // per-die local modifiers
  numericModifier?: number;
  advantage?: 'none' | 'adv' | 'dis';
  rerollEnabled?: boolean;
  rerollOperator?: '<'|'>'|'=';
  rerollValue?: number;
  rerollValuesStr?: string;  // comma-separated values for '=' operator
  customName?: string;
};
