"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { cn } from "@/lib/utils/cn";

export type LedgerCalendarView = "week" | "month";

interface LedgerDateStripProps {
  /** YYYY-MM-DD (KST) */
  selectedDate: string;
  /** YYYY-MM-DD (KST) */
  today: string;
  view: LedgerCalendarView;
  entriesByDate: Map<string, LedgerEntryWithDetails[]>;
  onSelect: (date: string) => void;
  onViewChange: (view: LedgerCalendarView) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function toKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Weeks (Sun–Sat) of the selected month; days outside the month are null.
function buildMonthWeeks(year: number, month: number): (number | null)[][] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) =>
    cells.slice(week * 7, week * 7 + 7),
  );
}

function formatDayAmount(amount: number) {
  return amount >= 1_000_000
    ? `${Math.floor(amount / 10_000)}만`
    : amount.toLocaleString("ko-KR");
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
  view,
  entriesByDate,
  onSelect,
  onViewChange,
}: LedgerDateStripProps) {
  const [year, month, selectedDay] = selectedDate.split("-").map(Number);
  const weeks = buildMonthWeeks(year, month);
  const visibleWeeks =
    view === "month"
      ? weeks
      : weeks.filter((week) => week.includes(selectedDay));
  const isMonth = view === "month";

  return (
    <div>
      <div className="grid grid-cols-7 text-center text-xs text-gray-400">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} aria-hidden="true" className="py-1">
            {weekday}
          </span>
        ))}
      </div>
      <div>
        {visibleWeeks.map((week) => (
          <div key={week.find(Boolean)} className="grid grid-cols-7">
            {week.map((day, index) => {
              if (day === null)
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed 7-slot week
                return <span key={`empty-${index}`} />;
              const key = toKey(year, month, day);
              const { income, expense } = sumDay(entriesByDate.get(key));
              const isSelected = key === selectedDate;
              const label = [
                `${month}월 ${day}일 ${WEEKDAYS[index]}요일`,
                expense > 0
                  ? `지출 ${expense.toLocaleString("ko-KR")}원`
                  : null,
                income > 0 ? `수입 ${income.toLocaleString("ko-KR")}원` : null,
              ]
                .filter(Boolean)
                .join(", ");
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={label}
                  aria-pressed={isSelected}
                  aria-current={key === today ? "date" : undefined}
                  onClick={() => onSelect(key)}
                  className="flex min-h-11 min-w-0 flex-col items-center"
                >
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full text-[15px] tabular-nums",
                      isSelected
                        ? "bg-gray-900 font-semibold text-white"
                        : key === today
                          ? "font-semibold text-gray-900"
                          : "text-gray-700",
                    )}
                  >
                    {day}
                  </span>
                  <span className="flex min-h-5 flex-col items-center pt-0.5 text-[10px] leading-3 tabular-nums">
                    {expense > 0 && (
                      <span className="text-blue-500">
                        -{formatDayAmount(expense)}
                      </span>
                    )}
                    {income > 0 && (
                      <span className="text-red-500">
                        +{formatDayAmount(income)}
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
        aria-expanded={isMonth}
        aria-label={isMonth ? "주간 달력으로 접기" : "월간 달력 펼치기"}
        onClick={() => onViewChange(isMonth ? "week" : "month")}
        className="flex min-h-11 w-full items-center justify-center text-gray-400"
      >
        {isMonth ? (
          <ChevronUp className="size-5" />
        ) : (
          <ChevronDown className="size-5" />
        )}
      </button>
    </div>
  );
}
