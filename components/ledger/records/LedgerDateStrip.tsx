"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { cn } from "@/lib/utils/cn";

interface LedgerDateStripProps {
  /** YYYY-MM-DD (KST) */
  selectedDate: string;
  /** YYYY-MM-DD (KST) */
  today: string;
  entriesByDate: Map<string, LedgerEntryWithDetails[]>;
  onSelect: (date: string) => void;
}

interface CalendarDay {
  key: string;
  month: number;
  day: number;
  isInMonth: boolean;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const HUNDRED_MILLION = 100_000_000;

// Weeks (Sun-Sat) covering the selected month, padded with the neighboring
// months' days.
function buildMonthWeeks(year: number, month: number): CalendarDay[][] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, index - firstWeekday + 1));
    return {
      key: date.toISOString().slice(0, 10),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      isInMonth: date.getUTCMonth() + 1 === month,
    };
  });
  return Array.from({ length: cellCount / 7 }, (_, week) =>
    cells.slice(week * 7, week * 7 + 7),
  );
}

// Full won amount with commas; 1억 and above shortened to one decimal (내림).
function formatDayAmount(amount: number) {
  if (amount < HUNDRED_MILLION) return amount.toLocaleString("ko-KR");
  const tenths = Math.floor(amount / (HUNDRED_MILLION / 10)) / 10;
  return `${tenths.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억`;
}

function sumDay(entries: LedgerEntryWithDetails[] | undefined) {
  let income = 0;
  let expense = 0;
  for (const entry of entries ?? []) {
    if (entry.type === "income") income += entry.amount;
    else if (entry.type === "expense") expense += entry.amount;
  }
  return { income, expense };
}

export function LedgerDateStrip({
  selectedDate,
  today,
  entriesByDate,
  onSelect,
}: LedgerDateStripProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [year, month] = selectedDate.split("-").map(Number);
  const weeks = buildMonthWeeks(year, month);
  const visibleWeeks = isExpanded
    ? weeks
    : weeks.filter((week) => week.some((cell) => cell.key === selectedDate));

  return (
    <div>
      <div className="grid grid-cols-7 text-center text-xs text-gray-500">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} aria-hidden="true" className="py-1">
            {weekday}
          </span>
        ))}
      </div>
      <div>
        {visibleWeeks.map((week) => (
          <div key={week[0].key} className="grid grid-cols-7">
            {week.map((cell, index) => {
              const dateLabel = `${cell.month}월 ${cell.day}일 ${WEEKDAYS[index]}요일`;
              if (!cell.isInMonth)
                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled
                    aria-label={dateLabel}
                    className="flex min-h-11 min-w-0 flex-col items-center"
                  >
                    <span className="flex size-9 items-center justify-center text-[15px] text-gray-300 tabular-nums">
                      {cell.day}
                    </span>
                  </button>
                );
              const { income, expense } = sumDay(entriesByDate.get(cell.key));
              const isSelected = cell.key === selectedDate;
              const isToday = cell.key === today;
              const label = [
                dateLabel,
                income > 0 ? `수입 ${income.toLocaleString("ko-KR")}원` : null,
                expense > 0
                  ? `지출 ${expense.toLocaleString("ko-KR")}원`
                  : null,
                isSelected ? "선택됨" : null,
              ]
                .filter(Boolean)
                .join(", ");
              return (
                <button
                  key={cell.key}
                  type="button"
                  aria-label={label}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => onSelect(cell.key)}
                  className="flex min-h-11 min-w-0 flex-col items-center"
                >
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full text-[15px] tabular-nums",
                      isSelected
                        ? "bg-gray-900 font-semibold text-white"
                        : isToday
                          ? "font-semibold text-gray-900"
                          : "text-gray-700",
                    )}
                  >
                    {cell.day}
                  </span>
                  <span className="flex min-h-5 flex-col items-center pt-0.5 text-[11px] leading-3 tabular-nums">
                    {income > 0 && (
                      <span className="text-red-600">
                        +{formatDayAmount(income)}
                      </span>
                    )}
                    {expense > 0 && (
                      <span className="text-gray-600">
                        -{formatDayAmount(expense)}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "주간 달력으로 접기" : "월간 달력 펼치기"}
        onClick={() => setIsExpanded((expanded) => !expanded)}
        className="flex min-h-11 w-full items-center justify-center text-gray-500"
      >
        {isExpanded ? (
          <ChevronUp className="size-5" />
        ) : (
          <ChevronDown className="size-5" />
        )}
      </button>
    </div>
  );
}
