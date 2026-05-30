import Link from "next/link";
import { formatCurrency } from "@/lib/utils/format";

interface CashFlowCardProps {
  title?: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
  month: number;
  hasRecentOwnLedgerActivity?: boolean;
  lastOwnLedgerEntryCreatedAt?: string | null;
}

export function CashFlowCard({
  title = "현금 흐름",
  totalIncome,
  totalExpense,
  balance,
  savingsRate,
  month,
  hasRecentOwnLedgerActivity = true,
  lastOwnLedgerEntryCreatedAt,
}: CashFlowCardProps) {
  const shouldShowLedgerPrompt =
    !hasRecentOwnLedgerActivity || lastOwnLedgerEntryCreatedAt === null;

  if (totalIncome === 0 && totalExpense === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-gray-500">
          {month}월 {title}
        </p>
        <p className="mt-3 text-2xl font-bold text-gray-900">
          이번 달 흐름을 아직 알 수 없어요
        </p>
        <p className="mt-2 text-sm text-gray-500">
          첫 지출이나 수입을 기록하면 이번 달 흐름을 볼 수 있어요.
          {shouldShowLedgerPrompt && (
            <>
              {" "}
              <Link
                href="/ledger/records/new/full"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                기록해보세요
              </Link>
            </>
          )}
        </p>
      </div>
    );
  }

  const isPositive = balance >= 0;
  const absoluteBalance = Math.abs(balance);
  const headline = isPositive
    ? `이번 달은 아직 ${formatCurrency(absoluteBalance)} 남았어요`
    : `이번 달은 ${formatCurrency(absoluteBalance)} 초과 지출 중이에요`;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <p className="text-sm text-gray-500">
        {month}월 {title}
      </p>
      <p
        className={`mt-3 text-2xl font-bold leading-tight ${isPositive ? "text-gray-900" : "text-red-500"}`}
      >
        {headline}
      </p>
      <p className="mt-2 text-sm text-gray-500">
        저축률 {Math.round(savingsRate)}%로 흘러가고 있어요
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">수입</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">지출</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(totalExpense)}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-gray-50 p-4">
        <p className="text-xs text-gray-400 mb-1">남은 금액</p>
        <p
          className={`text-3xl font-bold ${isPositive ? "text-gray-900" : "text-red-500"}`}
        >
          {isPositive ? "+" : ""}
          {formatCurrency(balance)}
        </p>
      </div>

      {!hasRecentOwnLedgerActivity && lastOwnLedgerEntryCreatedAt && (
        <p className="mt-4 text-sm text-gray-500">
          최근 기록이 뜸해요. 오늘의 지출이나 수입을{" "}
          <Link
            href="/ledger/records/new/full"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            기록해보세요
          </Link>
        </p>
      )}
    </div>
  );
}
