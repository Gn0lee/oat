"use client";

import {
  GroupedList,
  ScreenSection,
  ScreenState,
  SectionHeader,
} from "@/components/layout/screen";
import { Badge } from "@/components/ui/badge";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { formatKst } from "@/lib/date";
import { LedgerEntryRow } from "./LedgerEntryRow";

interface LedgerDayEntryListProps {
  selectedDate: Date;
  entries: LedgerEntryWithDetails[];
}

export function LedgerDayEntryList({
  selectedDate,
  entries,
}: LedgerDayEntryListProps) {
  const dateLabel = formatKst(selectedDate, "M월 d일 (eee)");
  const dateParam = formatKst(selectedDate, "yyyy-MM-dd");

  return (
    <ScreenSection className="mt-4 md:mt-0">
      <SectionHeader
        title={dateLabel}
        action={
          entries.length > 0 ? (
            <Badge variant="secondary" className="font-medium">
              {entries.length}건
            </Badge>
          ) : null
        }
      />

      {entries.length === 0 ? (
        <ScreenState type="empty" title="이 날의 기록이 없습니다." />
      ) : (
        <GroupedList>
          {entries.map((entry) => (
            <LedgerEntryRow
              key={entry.id}
              entry={entry}
              href={`/ledger/records/${entry.id}?from=records&date=${dateParam}`}
            />
          ))}
        </GroupedList>
      )}
    </ScreenSection>
  );
}
