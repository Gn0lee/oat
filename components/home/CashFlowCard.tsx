import { formatCurrency } from "@/lib/utils/format";

interface CashFlowCardProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
  month: number;
}

export function CashFlowCard({
  totalIncome,
  totalExpense,
  balance,
  savingsRate,
  month,
}: CashFlowCardProps) {
  if (totalIncome === 0 && totalExpense === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-gray-500 mb-4">{month}월 현금 흐름</p>
        <p className="text-sm text-gray-400 text-center py-2">
          가계부를 기록하면 현금 흐름이 표시돼요
        </p>
      </div>
    );
  }

  const isPositive = balance >= 0;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <p className="text-sm text-gray-500 mb-4">{month}월 현금 흐름</p>
      <div className="flex justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">수입</p>
          <p className="text-lg font-semibold text-blue-500">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-1">지출</p>
          <p className="text-lg font-semibold text-red-400">
            {formatCurrency(totalExpense)}
          </p>
        </div>
      </div>
      <div className="h-px bg-gray-100 mb-4" />
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">남은 금액</p>
          <p
            className={`text-3xl font-bold ${isPositive ? "text-gray-900" : "text-red-500"}`}
          >
            {isPositive ? "+" : ""}
            {formatCurrency(balance)}
          </p>
        </div>
        <p className="text-sm text-gray-500">
          저축률 {savingsRate.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
