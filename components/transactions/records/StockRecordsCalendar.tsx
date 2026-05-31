"use client";

import { RefreshCw } from "lucide-react";
import { type ComponentProps, useCallback } from "react";
import type { DayButton } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import type { StockRecordDailySummary } from "@/lib/stock-records/records";

interface StockRecordsCalendarProps {
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  summariesByDate: Map<string, StockRecordDailySummary>;
  onRefresh: () => void;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function StockRecordsCalendar({
  currentMonth,
  onMonthChange,
  selectedDate,
  onDateSelect,
  summariesByDate,
  onRefresh,
}: StockRecordsCalendarProps) {
  const DayButtonWithCounts = useCallback(
    function DayButtonWithCounts({
      day,
      modifiers,
      children,
      ...props
    }: ComponentProps<typeof DayButton>) {
      const summary = summariesByDate.get(formatDateKey(day.date));
      const isSelected =
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle;

      return (
        <CalendarDayButton
          day={day}
          modifiers={modifiers}
          {...props}
          className="flex-col gap-0 py-1 data-[selected-single=true]:!bg-transparent data-[selected-single=true]:!text-inherit hover:!bg-transparent"
        >
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

          <span className="flex min-h-[22px] flex-col items-center justify-start gap-0.5 pt-0.5">
            {summary && summary.buy > 0 && (
              <span className="text-[9px] font-medium text-red-500 leading-none">
                매수 {summary.buy}건
              </span>
            )}
            {summary && summary.sell > 0 && (
              <span className="text-[9px] text-blue-500 leading-none">
                매도 {summary.sell}건
              </span>
            )}
          </span>
        </CalendarDayButton>
      );
    },
    [summariesByDate],
  );

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white">
      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        className="absolute top-5 right-6 z-10 h-7 w-7 text-gray-400 hover:text-gray-600"
        title="새로고침"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </Button>
      <Calendar
        mode="single"
        month={currentMonth}
        onMonthChange={onMonthChange}
        selected={selectedDate}
        onSelect={(date) => date && onDateSelect(date)}
        hideNavigation
        components={{ DayButton: DayButtonWithCounts }}
        className="w-full"
        classNames={{
          day: "group/day relative w-full p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-md [&:first-child[data-selected=true]_button]:rounded-l-md",
        }}
      />
    </div>
  );
}
