import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDiceHistoryLocal } from '../dice';

describe('getDiceHistoryLocal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns parsed data when localStorage has valid JSON', () => {
    const mockData = [{ id: '1', payload: 'test', created_at: '2023-01-01' }];
    localStorage.setItem('tools:diceHistory', JSON.stringify(mockData));
    expect(getDiceHistoryLocal()).toEqual(mockData);
  });

  it('returns empty array when localStorage is empty', () => {
    expect(getDiceHistoryLocal()).toEqual([]);
  });

  it('returns empty array and handles invalid JSON in localStorage', () => {
    localStorage.setItem('tools:diceHistory', 'invalid json');
    expect(getDiceHistoryLocal()).toEqual([]);
  });

  it('returns empty array when localStorage throws an error', () => {
    vi.spyOn(globalThis.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('Storage access denied');
    });
    expect(getDiceHistoryLocal()).toEqual([]);
  });
});
