"use client";

import { useQueryClient } from "@tanstack/react-query";
import { addMonths, getYear, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LedgerEntryDeleteDialog } from "@/components/ledger/LedgerEntryDeleteDialog";
import { LedgerEntryEditDialog } from "@/components/ledger/LedgerEntryEditDialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLedgerEntries } from "@/hooks/use-ledger-entries";
import {
  calculateLedgerSummary,
  type LedgerEntryWithDetails,
} from "@/lib/api/ledger";
import { queries } from "@/lib/queries/keys";
import { formatCurrency, formatDateISO } from "@/lib/utils/format";
import { LedgerCalendar } from "./LedgerCalendar";
import { LedgerDayEntryList } from "./LedgerDayEntryList";

const CURRENT_YEAR = getYear(new Date());
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - 5 + i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export function LedgerRecordsClient() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEntry, setSelectedEntry] =
    useState<LedgerEntryWithDetails | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const queryClient = useQueryClient();

  const prevMonth = useMemo(() => subMonths(currentMonth, 1), [currentMonth]);
  const nextMonth = useMemo(() => addMonths(currentMonth, 1), [currentMonth]);

  const { data: prevEntries = [] } = useLedgerEntries({
    year: prevMonth.getFullYear(),
    month: prevMonth.getMonth() + 1,
  });
  const { data: entries = [], isLoading } = useLedgerEntries({
    year: currentMonth.getFullYear(),
    month: currentMonth.getMonth() + 1,
  });
  const { data: nextEntries = [] } = useLedgerEntries({
    year: nextMonth.getFullYear(),
    month: nextMonth.getMonth() + 1,
  });

  const summary = useMemo(() => calculateLedgerSummary(entries), [entries]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, LedgerEntryWithDetails[]>();
    for (const entry of [...prevEntries, ...entries, ...nextEntries]) {
      const key = entry.transactedAt.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [prevEntries, entries, nextEntries]);

  const dayEntries = entriesByDate.get(formatDateISO(selectedDate)) ?? [];

  const handleEdit = (entry: LedgerEntryWithDetails) => {
    setSelectedEntry(entry);
    setEditOpen(true);
  };

  const handleDelete = (entry: LedgerEntryWithDetails) => {
    setSelectedEntry(entry);
    setDeleteOpen(true);
  };

  const goToPrevMonth = () =>
    setCurrentMonth((m) => startOfMonth(subMonths(m, 1)));
  const goToNextMonth = () =>
    setCurrentMonth((m) => startOfMonth(addMonths(m, 1)));

  const handleMonthChange = (month: Date) =>
    setCurrentMonth(startOfMonth(month));

  const handleYearChange = (year: string) => {
    setCurrentMonth((m) => {
      const next = new Date(m);
      next.setFullYear(Number(year));
      return startOfMonth(next);
    });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queries.ledgerEntries._def });
  };

  const handleMonthSelect = (month: string) => {
    setCurrentMonth((m) => {
      const next = new Date(m);
      next.setMonth(Number(month) - 1);
      return startOfMonth(next);
    });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // 선택된 날짜가 현재 표시 월과 다르면 월도 변경
    if (
      date.getFullYear() !== currentMonth.getFullYear() ||
      date.getMonth() !== currentMonth.getMonth()
    ) {
      setCurrentMonth(startOfMonth(date));
    }
  };

  const summaryCard = isLoading ? (
    <Skeleton className="h-16 rounded-2xl mb-4" />
  ) : (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 grid grid-cols-3 gap-2 text-center">
      <div>
        <p className="text-xs text-gray-500 mb-1">입금</p>
        <p className="text-sm font-semibold text-red-500">
          +{formatCurrency(summary.totalIncome)}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">지출</p>
        <p className="text-sm font-semibold text-blue-500">
          -{formatCurrency(summary.totalExpense)}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">잔액</p>
        <p
          className={`text-sm font-semibold ${
            summary.balance >= 0 ? "text-gray-900" : "text-blue-500"
          }`}
        >
          {summary.balance >= 0 ? "+" : ""}
          {formatCurrency(summary.balance)}
        </p>
      </div>
    </div>
  );

  const calendarSection = isLoading ? (
    <Skeleton className="h-72 rounded-2xl" />
  ) : (
    <LedgerCalendar
      currentMonth={currentMonth}
      onMonthChange={handleMonthChange}
      selectedDate={selectedDate}
      onDateSelect={handleDateSelect}
      entriesByDate={entriesByDate}
      onRefresh={handleRefresh}
    />
  );

  return (
    <div className="pb-6">
      {/* 월 네비게이션 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-1">
          <Select
            value={String(currentMonth.getFullYear())}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="h-auto w-auto gap-0.5 border-none shadow-none px-1.5 py-0.5 text-lg font-semibold text-gray-900 focus:ring-0 rounded-lg hover:bg-gray-100 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(currentMonth.getMonth() + 1)}
            onValueChange={handleMonthSelect}
          >
            <SelectTrigger className="h-auto w-auto gap-0.5 border-none shadow-none px-1.5 py-0.5 text-lg font-semibold text-gray-900 focus:ring-0 rounded-lg hover:bg-gray-100 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m}월
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* md 이상: 캘린더(좌) + 목록(우) 2컬럼 / 모바일: 단일 컬럼 */}
      <div className="md:grid md:grid-cols-[auto_1fr] md:gap-6 md:items-start">
        {/* 좌측: 요약 + 캘린더 */}
        <div className="md:w-[450px]">
          {summaryCard}
          {calendarSection}
        </div>

        {/* 우측(데스크탑) / 하단(모바일): 항목 목록 + 등록 버튼 */}
        <div className="flex flex-col gap-4">
          <LedgerDayEntryList
            selectedDate={selectedDate}
            entries={dayEntries}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          <Button asChild className="w-full" size="icon-sm">
            <Link href="/ledger/new">
              <Plus className="w-5 h-5" />
              가계부 등록
            </Link>
          </Button>
        </div>
      </div>

      {/* 수정/삭제 다이얼로그 */}
      <LedgerEntryEditDialog
        entry={selectedEntry}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <LedgerEntryDeleteDialog
        entry={selectedEntry}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
