"use client";

import {
  GroupedList,
  ScreenSection,
  ScreenState,
  SectionHeader,
} from "@/components/layout/screen";
import { StockTransactionRow } from "@/components/transactions/StockTransactionRow";
import { Badge } from "@/components/ui/badge";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { formatDate } from "@/lib/utils/format";

interface StockRecordDayListProps {
  selectedDate: string;
  transactions: TransactionWithDetails[];
}

export function StockRecordDayList({
  selectedDate,
  transactions,
}: StockRecordDayListProps) {
  return (
    <ScreenSection>
      <SectionHeader
        title={formatDate(selectedDate)}
        action={
          transactions.length > 0 ? (
            <Badge variant="secondary" className="font-medium">
              {transactions.length}건
            </Badge>
          ) : null
        }
      />

      {transactions.length > 0 ? (
        <GroupedList>
          {transactions.map((transaction) => {
            return (
              <StockTransactionRow
                key={transaction.id}
                href={`/assets/stock/transactions/${transaction.id}?from=records&date=${selectedDate}`}
                transaction={transaction}
              />
            );
          })}
        </GroupedList>
      ) : (
        <ScreenState
          type="empty"
          title="선택한 날짜의 거래가 없습니다."
          description="날짜를 바꾸거나 새 거래를 추가해보세요."
        />
      )}
    </ScreenSection>
  );
}
