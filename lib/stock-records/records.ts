import type { TransactionWithDetails } from "@/lib/api/transaction";
import { formatDateISO } from "@/lib/utils/format";

export interface StockRecordDailySummary {
  buy: number;
  sell: number;
}

const RECORD_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeRecordDate(
  date: string | undefined,
  fallback: string,
) {
  return date && RECORD_DATE_PATTERN.test(date) ? date : fallback;
}

export function buildStockRecordDailySummaries(
  transactions: TransactionWithDetails[],
) {
  const summaries = new Map<string, StockRecordDailySummary>();

  for (const transaction of transactions) {
    const dateKey = formatDateISO(transaction.transactedAt);
    const summary = summaries.get(dateKey) ?? { buy: 0, sell: 0 };
    summary[transaction.type] += 1;
    summaries.set(dateKey, summary);
  }

  return summaries;
}

export function getTransactionsForRecordDate(
  transactions: TransactionWithDetails[],
  date: string,
) {
  return transactions.filter(
    (transaction) => formatDateISO(transaction.transactedAt) === date,
  );
}
