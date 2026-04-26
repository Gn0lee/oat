"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { LedgerEntryRow } from "./LedgerEntryRow";

interface LedgerDayEntryListProps {
  selectedDate: Date;
  entries: LedgerEntryWithDetails[];
  onEdit: (entry: LedgerEntryWithDetails) => void;
  onDelete: (entry: LedgerEntryWithDetails) => void;
}

export function LedgerDayEntryList({
  selectedDate,
  entries,
  onEdit,
  onDelete,
}: LedgerDayEntryListProps) {
  const dateLabel = format(selectedDate, "M월 d일 (eee)", { locale: ko });

  return (
    <div className="bg-white rounded-2xl shadow-sm mt-4 md:mt-0">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-700">{dateLabel}</h3>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-gray-400">
          이 날의 기록이 없습니다.
        </p>
      ) : (
        <div className="px-4 pb-2">
          {entries.map((entry) => (
            <LedgerEntryRow
              key={entry.id}
              entry={entry}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
