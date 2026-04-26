import type { LedgerStatsSummary } from "@/lib/api/ledger-stats";
import { formatCurrency } from "@/lib/utils/format";

interface SummaryStatCardProps {
  summary: LedgerStatsSummary;
}

export function SummaryStatCard({ summary }: SummaryStatCardProps) {
  const { totalIncome, totalExpense, balance, savingsRate, month } = summary;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
      <h2 className="text-sm text-gray-500 mb-4">{month}월 현금 흐름</h2>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <span className="text-gray-700">잔액</span>
          <span
            className={`text-3xl font-bold ${balance >= 0 ? "text-gray-900" : "text-blue-500"}`}
          >
            {formatCurrency(balance)}
          </span>
        </div>

        <div className="h-px bg-gray-100" />

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">수입</span>
          <span className="font-medium text-red-500">
            {formatCurrency(totalIncome)}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">지출</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(totalExpense)}
          </span>
        </div>

        {totalIncome > 0 && (
          <>
            <div className="h-px bg-gray-100" />
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">저축률</span>
              <span
                className={`font-semibold ${savingsRate >= 20 ? "text-green-600" : savingsRate >= 10 ? "text-yellow-600" : "text-red-500"}`}
              >
                {savingsRate.toFixed(1)}%
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
