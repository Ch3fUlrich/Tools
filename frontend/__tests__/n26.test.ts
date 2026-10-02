import { describe, it, expect, vi } from 'vitest';
import { analyzeN26DataLocal } from '../lib/local/n26';

vi.mock('@/lib/api/client', () => ({}));

describe('analyzeN26DataLocal', () => {
  it('throws an error if "data" object is missing', () => {
    expect(() => analyzeN26DataLocal({})).toThrow('Invalid N26 data: missing "data" object');
    expect(() => analyzeN26DataLocal({ data: null })).toThrow('Invalid N26 data: missing "data" object');
    expect(() => analyzeN26DataLocal({ data: 'string' })).toThrow('Invalid N26 data: missing "data" object');
  });

  it('processes empty data object', () => {
    const result = analyzeN26DataLocal({ data: {} });
    expect(result).toEqual({
      transactions: [],
      category_totals: {},
      overall_total: 0,
    });
  });

  it('processes cash26Data', () => {
    const data = {
      data: {
        cash26Data: [
          { amount: 100, transaction_date: '2023-01-01', transaction_type: 'deposit' },
          { amount: -50, transaction_date: '2023-01-02', transaction_type: 'withdrawal' },
          { invalid: 'entry' },
        ],
      },
    };
    const result = analyzeN26DataLocal(data);
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toEqual({
      amount: 100,
      date: '2023-01-01',
      category: 'cash26Data',
      comment: 'deposit',
    });
    expect(result.category_totals['cash26Data']).toBe(50);
    expect(result.overall_total).toBe(50);
  });

  it('processes bankTransfers', () => {
    const data = {
      data: {
        bankTransfers: [
          { amount: 500, ts: '2023-01-01T10:00:00Z', reference_text: 'Salary' },
          { amount: -100, ts: '2023-01-02T12:00:00Z', reference_text: 'Rent' },
        ],
      },
    };
    const result = analyzeN26DataLocal(data);
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toEqual({
      amount: 500,
      date: '2023-01-01T10:00:00Z',
      category: 'bankTransfers',
      comment: 'Salary',
    });
    expect(result.category_totals['bankTransfers']).toBe(400);
    expect(result.overall_total).toBe(400);
  });

  it('processes cardTransactions', () => {
    const data = {
      data: {
        cardTransactions: [
          { end_amount: 20, transaction_date: '2023-01-03', merchant_name: 'Grocery Store', original_amount: 20 },
          { end_amount: 5, transaction_date: '2023-01-04', merchant_name: 'Coffee Shop' },
        ],
      },
    };
    const result = analyzeN26DataLocal(data);
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toEqual({
      amount: -20, // Negative amount as per actual function logic
      date: '2023-01-03',
      category: 'cardTransactions',
      comment: 'Grocery Store: 20', // originalAmount fallback to endAmount if original_amount missing? Yes
    });
    expect(result.transactions[1]).toEqual({
      amount: -5,
      date: '2023-01-04',
      category: 'cardTransactions',
      comment: 'Coffee Shop: 5', // originalAmount is endAmount here
    });
    expect(result.category_totals['cardTransactions']).toBe(-25);
    expect(result.overall_total).toBe(-25);
  });

  it('processes mixed data and calculates totals correctly', () => {
    const data = {
      data: {
        cash26Data: [{ amount: 100, transaction_date: '2023-01-01', transaction_type: 'deposit' }],
        bankTransfers: [{ amount: 500, ts: '2023-01-01', reference_text: 'Salary' }],
        cardTransactions: [{ end_amount: 50, transaction_date: '2023-01-02', merchant_name: 'Store' }],
      },
    };
    const result = analyzeN26DataLocal(data);
    expect(result.transactions).toHaveLength(3);
    expect(result.category_totals).toEqual({
      cash26Data: 100,
      bankTransfers: 500,
      cardTransactions: -50,
    });
    expect(result.overall_total).toBe(550);
  });
});
