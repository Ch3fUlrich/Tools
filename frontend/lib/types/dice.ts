export type DieType = 'd2'|'d3'|'d4'|'d6'|'d8'|'d10'|'d12'|'d20'|'custom';

export interface DiceRequest {
  die: { type: DieType; sides?: number };
  count: number;
  advantage?: 'none'|'adv'|'dis';
  advantageMode?: 'per-die'|'per-set';
  reroll?: { mode: 'lt'|'gt'; threshold: number; maxRerolls?: number };
  maxRerollsPerDie?: number;
  rolls?: number;
  options?: { includePerDieDetail?: boolean };
}

export interface PerDieDetail { original: number[]; final: number }

export interface DiceRollResult { perDie: PerDieDetail[]; used: number[]; sum: number; average: number; median: number; spread: number }

export interface DiceResponse { rolls: DiceRollResult[]; summary: { totalRollsRequested: number } }

export default DiceRequest;
