"use client";

import { useMemo } from "react";
import {
  GroupedList,
  ScreenSection,
  ScreenState,
  SectionHeader,
} from "@/components/layout/screen";
import { StockTransactionRow } from "@/components/transactions/StockTransactionRow";
import { Badge } from "@/components/ui/badge";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { formatDate, formatDateISO } from "@/lib/utils/format";

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
  const detailHref = `/assets/stock/transactions/${transaction.id}?${detailQueryString}`;

  return <StockTransactionRow href={detailHref} transaction={transaction} />;
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
