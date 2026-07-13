import { jsonPost, authGet, withLocalFallback } from '../core';
import { rollDiceLocal } from '@/lib/local/dice';
import type { DiceRequest as DiceRequestFull } from '@/lib/types/dice';
import type { RollDicePayload, DiceHistoryEntry } from '../../types/api/types';

export async function rollDice(payload: RollDicePayload) {
  return withLocalFallback(
    () => jsonPost<DiceRequestFull>('/api/tools/dice/roll', payload, 'Roll API error'),
    () => rollDiceLocal(payload)
  );
}

export async function saveDiceRoll(payload: unknown): Promise<void> {
  return jsonPost('/api/tools/dice/save', payload, 'Failed to save dice roll');
}

export async function getDiceHistory(): Promise<DiceHistoryEntry[]> {
  return authGet('/api/tools/dice/history', 'Failed to load dice history');
}
