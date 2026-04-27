import type { LedgerStatsSummary } from "@/lib/api/ledger-stats";
import { formatCurrency } from "@/lib/utils/format";

interface SummaryStatCardProps {
  summary: LedgerStatsSummary;
  scope: "shared" | "personal";
}

function calcSavingsRate(income: number, expense: number) {
  if (income === 0) return 0;
  return Math.round(((income - expense) / income) * 10000) / 100;
}

export function SummaryStatCard({ summary, scope }: SummaryStatCardProps) {
  const { month } = summary;

  const expense =
    scope === "personal"
      ? summary.totalPersonalExpense
      : summary.totalSharedExpense;

  const income = scope === "personal" ? 0 : summary.totalIncome;
  const balance = income - expense;
  const savingsRate = calcSavingsRate(income, expense);

  const scopeLabel = scope === "personal" ? "내 개인" : "공용";

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
      <h2 className="text-sm text-gray-500 mb-4">
        {month}월 {scopeLabel} 현금 흐름
      </h2>

      <div className="space-y-3">
        {scope !== "personal" && (
          <div className="flex justify-between items-end">
            <span className="text-gray-700">잔액</span>
            <span
              className={`text-3xl font-bold ${balance >= 0 ? "text-gray-900" : "text-blue-500"}`}
            >
              {formatCurrency(balance)}
            </span>
          </div>
        )}

        {scope !== "personal" && <div className="h-px bg-gray-100" />}

        {scope !== "personal" && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">수입</span>
            <span className="font-medium text-red-500">
              {formatCurrency(income)}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">지출</span>
          <span
            className={`font-medium ${scope === "personal" ? "text-2xl font-bold text-gray-900" : "text-gray-900"}`}
          >
            {formatCurrency(expense)}
          </span>
        </div>

        {scope !== "personal" && income > 0 && (
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
