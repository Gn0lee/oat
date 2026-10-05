import type { LedgerStatsSummary } from "@/lib/api/ledger-stats";
import { formatCurrency } from "@/lib/utils/format";

interface SummaryStatCardProps {
  summary: LedgerStatsSummary;
  /** 특정 장부를 볼 때의 장부 이름. 없으면 전체 장부 */
  bookName?: string;
}

export function SummaryStatCard({ summary, bookName }: SummaryStatCardProps) {
  const { month } = summary;
  const isAllBooks = summary.bookId === null;

  const {
    totalIncome: income,
    totalExpense: expense,
    balance,
    savingsRate,
  } = summary.total;

  const title = `${month}월 ${isAllBooks ? "전체" : (bookName ?? "장부")} 현금흐름`;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
      <h2 className="text-sm text-gray-500 mb-4">{title}</h2>

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
            {formatCurrency(income)}
          </span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">지출</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(expense)}
          </span>
        </div>

        {isAllBooks && (
          <dl className="space-y-1 rounded-xl bg-gray-50 px-3 py-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">공용 지출</dt>
              <dd className="text-gray-700">
                {formatCurrency(summary.shared.totalExpense)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">내 개인 지출</dt>
              <dd className="text-gray-700">
                {formatCurrency(summary.personal.totalExpense)}
              </dd>
            </div>
          </dl>
        )}

        {income > 0 && (
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
