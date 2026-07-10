import { DiceConfig } from './types';

export const LS_HISTORY_KEY = 'dice_history_local';

export function loadLocalHistory(): Array<{ time: string; summary?: { sum?: number }; details?: unknown[] }> {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveLocalHistory(entries: Array<{ time: string; summary?: { sum?: number }; details?: unknown[] }>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(entries.slice(0, 50)));
  } catch {
    // storage full or unavailable — ignore
  }
}

// Returns "D6" for a unique die type, or "1. D6" / "2. D6" when multiple configs share the same sides
export function getDieLabel(rollIndex: number, configs: DiceConfig[]): string {
  const cfgIndex = Math.min(rollIndex, configs.length - 1);
  const sides = configs[cfgIndex]?.sides ?? 6;
  const typeName = `D${sides}`;
  const sameTypeIndexes = configs.map((c, j) => (c.sides === sides ? j : -1)).filter(j => j >= 0);
  if (sameTypeIndexes.length > 1) {
    const rank = sameTypeIndexes.indexOf(cfgIndex) + 1;
    return `${rank}. ${typeName}`;
  }
  return typeName;
}

// Returns customName if set, otherwise getDieLabel
export function getDisplayLabel(idx: number, configs: DiceConfig[]): string {
  const cfg = configs[Math.min(idx, configs.length - 1)];
  if (cfg?.customName) return cfg.customName;
  return getDieLabel(idx, configs);
}

// Parse comma-separated reroll values string into number array
export function parseRerollValues(str: string): number[] {
  return str.split(',').map(s => s.trim()).filter(s => s !== '').map(Number).filter(n => Number.isFinite(n));
}

// Build reroll condition function from config; returns null if reroll not applicable
export function buildRerollCondition(cfg: DiceConfig): ((val: number) => boolean) | null {
  if (!cfg.rerollEnabled) return null;
  const op = cfg.rerollOperator || '<';
  if (op === '=') {
    const vals = new Set(parseRerollValues(cfg.rerollValuesStr || ''));
    return vals.size > 0 ? (v: number) => vals.has(v) : null;
  }
  if (!Number.isFinite(cfg.rerollValue ?? NaN)) return null;
  const rv = cfg.rerollValue as number;
  if (op === '<') return (v: number) => v < rv;
  if (op === '>') return (v: number) => v > rv;
  return null;
}

// Build display string for reroll config (e.g. "< 3" or "= 1, 6")
export function buildRerollConfigStr(cfg: DiceConfig): string {
  if (!cfg.rerollEnabled) return '';
  const op = cfg.rerollOperator || '<';
  if (op === '=') {
    const vals = parseRerollValues(cfg.rerollValuesStr || '');
    return vals.length > 0 ? `= ${vals.join(', ')}` : '';
  }
  return Number.isFinite(cfg.rerollValue ?? NaN) ? `${op} ${cfg.rerollValue}` : '';
}
