"use client";

import { User, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  AmountText,
  GroupedList,
  ScreenSection,
  ScreenState,
  SectionHeader,
} from "@/components/layout/screen";
import { Badge } from "@/components/ui/badge";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { formatCurrency, formatDate, formatDateISO } from "@/lib/utils/format";

interface TransactionTableProps {
  data: TransactionWithDetails[];
  detailQueryString: string;
}

interface TransactionDateGroup {
  dateKey: string;
  label: string;
  transactions: TransactionWithDetails[];
}

function groupTransactionsByDate(
  transactions: TransactionWithDetails[],
): TransactionDateGroup[] {
  const groups = new Map<string, TransactionWithDetails[]>();

  for (const transaction of transactions) {
    const dateKey = formatDateISO(transaction.transactedAt);
    const group = groups.get(dateKey) ?? [];
    group.push(transaction);
    groups.set(dateKey, group);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, group]) => ({
      dateKey,
      label: formatDate(dateKey),
      transactions: group.sort(
        (a, b) =>
          new Date(b.transactedAt).getTime() -
          new Date(a.transactedAt).getTime(),
      ),
    }));
}

function TransactionItem({
  transaction,
  detailQueryString,
}: {
  transaction: TransactionWithDetails;
  detailQueryString: string;
}) {
  const isBuy = transaction.type === "buy";
  const typeLabel = isBuy ? "매수" : "매도";
  const detailHref = `/assets/stock/transactions/${transaction.id}?${detailQueryString}`;

  return (
    <article>
      <Link
        href={detailHref}
        className="flex min-h-[72px] flex-col justify-center px-4 py-3.5 transition-colors hover:bg-gray-50 sm:px-5"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
          <div className="flex min-w-0 items-start gap-2">
            <Badge
              variant={isBuy ? "default" : "secondary"}
              className="shrink-0 px-1.5 py-0 text-[10px]"
            >
              {typeLabel}
            </Badge>
            <span className="line-clamp-2 min-w-0 text-left font-semibold text-gray-900 text-sm leading-5 break-words">
              {transaction.stockName}
            </span>
          </div>
          <div className="shrink-0 text-right">
            <AmountText
              amount={transaction.price * transaction.quantity}
              currency={transaction.currency}
              title={formatCurrency(
                transaction.price * transaction.quantity,
                transaction.currency,
              )}
              tone="neutral"
              className="text-sm font-medium"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500 text-xs">
          <span>{transaction.quantity.toLocaleString()}주</span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <User className="size-3 shrink-0" />
            <span className="truncate">{transaction.owner.name}</span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <Wallet className="size-3 shrink-0" />
            <span className="truncate">
              {transaction.accountName ?? "계좌 없음"}
            </span>
          </span>
        </div>
      </Link>
    </article>
  );
}

export function TransactionTable({
  data,
  detailQueryString,
}: TransactionTableProps) {
  const groups = useMemo(() => groupTransactionsByDate(data), [data]);

  return (
    <>
      {groups.length > 0 ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <ScreenSection key={group.dateKey}>
              <SectionHeader
                title={group.label}
                action={
                  <Badge variant="outline">{group.transactions.length}건</Badge>
                }
              />
              <GroupedList>
                {group.transactions.map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    detailQueryString={detailQueryString}
                  />
                ))}
              </GroupedList>
            </ScreenSection>
          ))}
        </div>
      ) : (
        <ScreenState
          type="empty"
          title="거래 내역이 없습니다."
          description="필터를 바꾸거나 새 거래를 추가해보세요."
        />
      )}
    </>
  );
}
