"use client";

import { useQueryClient } from "@tanstack/react-query";
import { addMonths, format, getYear, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactions } from "@/hooks/use-transaction";
import { queries } from "@/lib/queries/keys";
import {
  buildStockRecordDailySummaries,
  getTransactionsForRecordDate,
} from "@/lib/stock-records/records";
import { formatDateISO } from "@/lib/utils/format";
import { StockRecordDayList } from "./StockRecordDayList";
import { StockRecordsCalendar } from "./StockRecordsCalendar";

const CURRENT_YEAR = getYear(new Date());
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - 5 + i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

interface StockRecordsClientProps {
  currentUserId: string;
  initialDate: string;
}

function getMonthFilters(month: Date) {
  const start = startOfMonth(month);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);

  return {
    startDate: `${formatDateISO(start)}T00:00:00.000Z`,
    endDate: `${formatDateISO(end)}T23:59:59.999Z`,
  };
}

export function StockRecordsClient({
  currentUserId,
  initialDate,
}: StockRecordsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const initial = useMemo(
    () => new Date(`${initialDate}T00:00:00`),
    [initialDate],
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    startOfMonth(initial),
  );
  const [selectedDate, setSelectedDate] = useState<Date>(initial);

  const prevMonth = useMemo(() => subMonths(currentMonth, 1), [currentMonth]);
  const nextMonth = useMemo(() => addMonths(currentMonth, 1), [currentMonth]);

  const { data: prevTransactions } = useTransactions({
    filters: getMonthFilters(prevMonth),
    page: 1,
    pageSize: 500,
  });
  const { data: currentTransactions, isLoading } = useTransactions({
    filters: getMonthFilters(currentMonth),
    page: 1,
    pageSize: 500,
  });
  const { data: nextTransactions } = useTransactions({
    filters: getMonthFilters(nextMonth),
    page: 1,
    pageSize: 500,
  });

  const transactions = useMemo(
    () => [
      ...(prevTransactions?.data ?? []),
      ...(currentTransactions?.data ?? []),
      ...(nextTransactions?.data ?? []),
    ],
    [prevTransactions, currentTransactions, nextTransactions],
  );

  const selectedDateKey = formatDateISO(selectedDate);
  const summariesByDate = useMemo(
    () => buildStockRecordDailySummaries(transactions),
    [transactions],
  );
  const dayTransactions = useMemo(
    () => getTransactionsForRecordDate(transactions, selectedDateKey),
    [transactions, selectedDateKey],
  );

  const updateSelectedDateParam = (date: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", formatDateISO(date));
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    updateSelectedDateParam(date);
    if (
      date.getFullYear() !== currentMonth.getFullYear() ||
      date.getMonth() !== currentMonth.getMonth()
    ) {
      setCurrentMonth(startOfMonth(date));
    }
  };

  const changeMonthAndUpdateDate = (newMonthStart: Date) => {
    setCurrentMonth(newMonthStart);

    setSelectedDate((prevSelectedDate) => {
      const nextDate = new Date(newMonthStart);
      nextDate.setDate(prevSelectedDate.getDate());
      if (nextDate.getMonth() !== newMonthStart.getMonth()) {
        nextDate.setDate(0);
      }
      queueMicrotask(() => updateSelectedDateParam(nextDate));
      return nextDate;
    });
  };

  const goToPrevMonth = () =>
    changeMonthAndUpdateDate(startOfMonth(subMonths(currentMonth, 1)));
  const goToNextMonth = () =>
    changeMonthAndUpdateDate(startOfMonth(addMonths(currentMonth, 1)));

  const handleMonthChange = (month: Date) =>
    changeMonthAndUpdateDate(startOfMonth(month));

  const handleYearChange = (year: string) => {
    const next = new Date(currentMonth);
    next.setFullYear(Number(year));
    changeMonthAndUpdateDate(startOfMonth(next));
  };

  const handleMonthSelect = (month: string) => {
    const next = new Date(currentMonth);
    next.setMonth(Number(month) - 1);
    changeMonthAndUpdateDate(startOfMonth(next));
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queries.transactions._def });
  };

  return (
    <div className="pb-6">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-1">
          <Select
            value={String(currentMonth.getFullYear())}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="h-auto w-auto gap-0.5 rounded-lg border-none px-1.5 py-0.5 font-semibold text-gray-900 text-lg shadow-none transition-colors hover:bg-gray-100 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(currentMonth.getMonth() + 1)}
            onValueChange={handleMonthSelect}
          >
            <SelectTrigger className="h-auto w-auto gap-0.5 rounded-lg border-none px-1.5 py-0.5 font-semibold text-gray-900 text-lg shadow-none transition-colors hover:bg-gray-100 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((month) => (
                <SelectItem key={month} value={String(month)}>
                  {month}월
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-start md:gap-6">
        <div className="md:w-[450px]">
          {isLoading ? (
            <Skeleton className="h-72 rounded-2xl" />
          ) : (
            <StockRecordsCalendar
              currentMonth={currentMonth}
              onMonthChange={handleMonthChange}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              summariesByDate={summariesByDate}
              onRefresh={handleRefresh}
            />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <StockRecordDayList
            selectedDate={selectedDateKey}
            transactions={dayTransactions}
            currentUserId={currentUserId}
          />
          <Button asChild className="w-full" size="icon-sm">
            <Link
              href={`/assets/stock/transactions/new/daily?date=${format(selectedDate, "yyyy-MM-dd")}`}
            >
              <Plus className="h-5 w-5" />
              거래 등록
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
