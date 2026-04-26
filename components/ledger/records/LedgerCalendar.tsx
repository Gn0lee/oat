"use client";

import { RefreshCw } from "lucide-react";
import { type ComponentProps, useCallback } from "react";
import type { DayButton } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";

function formatAmountShort(amount: number): string {
  if (amount >= 10_000) {
    const man = Math.floor(amount / 10_000);
    return `${man}만`;
  }
  return amount.toLocaleString("ko-KR");
}

interface LedgerCalendarProps {
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  entriesByDate: Map<string, LedgerEntryWithDetails[]>;
  onRefresh: () => void;
}

export function LedgerCalendar({
  currentMonth,
  onMonthChange,
  selectedDate,
  onDateSelect,
  entriesByDate,
  onRefresh,
}: LedgerCalendarProps) {
  const DayButtonWithAmounts = useCallback(
    function DayButtonWithAmounts({
      day,
      modifiers,
      children,
      ...props
    }: ComponentProps<typeof DayButton>) {
      const d = day.date;
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayEntries = entriesByDate.get(dateKey) ?? [];

      let income = 0;
      let expense = 0;
      for (const e of dayEntries) {
        if (e.type === "income") income += e.amount;
        else if (e.type === "expense") expense += e.amount;
      }

      const isSelected =
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle;

      return (
        // 버튼 전체 배경 선택 스타일 제거 — 원형 숫자 span에서만 선택 표시
        <CalendarDayButton
          day={day}
          modifiers={modifiers}
          {...props}
          className="flex-col gap-0 py-1 data-[selected-single=true]:!bg-transparent data-[selected-single=true]:!text-inherit hover:!bg-transparent"
        >
          {/* 날짜 숫자 — 고정 높이 원형 버튼 영역 */}
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              isSelected
                ? "bg-gray-800 text-white"
                : modifiers.today
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-900"
            }`}
          >
            {children}
          </span>

          {/* 금액 텍스트 — 선택 상태 무관, 항상 동일 색상 */}
          <span className="flex min-h-[22px] flex-col items-center justify-start gap-0.5 pt-0.5">
            {income > 0 && (
              <span className="text-[9px] font-medium text-red-500 leading-none">
                +{formatAmountShort(income)}
              </span>
            )}
            {expense > 0 && (
              <span className="text-[9px] text-blue-500 leading-none">
                -{formatAmountShort(expense)}
              </span>
            )}
          </span>
        </CalendarDayButton>
      );
    },
    [entriesByDate],
  );

  return (
    <div className="relative bg-white rounded-2xl overflow-hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        className="absolute top-5 right-6 h-7 w-7 text-gray-400 hover:text-gray-600 z-10"
        title="새로고침"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </Button>
      <Calendar
        mode="single"
        month={currentMonth}
        onMonthChange={onMonthChange}
        selected={selectedDate}
        onSelect={(d) => d && onDateSelect(d)}
        hideNavigation
        components={{ DayButton: DayButtonWithAmounts }}
        className="w-full"
        classNames={{
          day: "group/day relative w-full p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-md [&:first-child[data-selected=true]_button]:rounded-l-md",
        }}
      />
    </div>
  );
}
