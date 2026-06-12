// Client-side N26 export analysis — mirrors backend/src/tools/n26_analyzer.rs.
// All processing stays in the browser; nothing is uploaded when offline.
import type { AnalysisResult, Transaction } from '@/lib/api/client';

type JsonRecord = Record<string, unknown>;

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function processCategory(
  entries: unknown[],
  category: string,
  amountField: string,
  dateField: string,
  commentField: string,
): Transaction[] {
  const transactions: Transaction[] = [];
  for (const raw of entries) {
    if (typeof raw !== 'object' || raw === null) continue;
    const entry = raw as JsonRecord;
    const amount = asNumber(entry[amountField]);
    const date = asString(entry[dateField]);
    const comment = asString(entry[commentField]);
    if (amount !== undefined && date !== undefined && comment !== undefined) {
      transactions.push({ amount, date, category, comment });
    }
  }
  return transactions;
}

export function analyzeN26DataLocal(data: Record<string, unknown>): AnalysisResult {
  const inner = data?.data;
  if (typeof inner !== 'object' || inner === null) {
    throw new Error('Invalid N26 data: missing "data" object');
  }
  const sections = inner as JsonRecord;
  const transactions: Transaction[] = [];

  const cashData = sections.cash26Data;
  if (Array.isArray(cashData)) {
    transactions.push(
      ...processCategory(cashData, 'cash26Data', 'amount', 'transaction_date', 'transaction_type'),
    );
  }

  const bankData = sections.bankTransfers;
  if (Array.isArray(bankData)) {
    transactions.push(
      ...processCategory(bankData, 'bankTransfers', 'amount', 'ts', 'reference_text'),
    );
  }

  const cardData = sections.cardTransactions;
  if (Array.isArray(cardData)) {
    for (const raw of cardData) {
      if (typeof raw !== 'object' || raw === null) continue;
      const entry = raw as JsonRecord;
      const endAmount = asNumber(entry.end_amount);
      const date = asString(entry.transaction_date);
      const merchant = asString(entry.merchant_name);
      if (endAmount !== undefined && date !== undefined && merchant !== undefined) {
        const originalAmount = asNumber(entry.original_amount) ?? endAmount;
        transactions.push({
          amount: -endAmount,
          date,
          category: 'cardTransactions',
          comment: `${merchant}: ${originalAmount}`,
        });
      }
    }
  }

  const categoryTotals: Record<string, number> = {};
  let overallTotal = 0;
  for (const tx of transactions) {
    categoryTotals[tx.category] = (categoryTotals[tx.category] ?? 0) + tx.amount;
    overallTotal += tx.amount;
  }

  return { transactions, category_totals: categoryTotals, overall_total: overallTotal };
}
