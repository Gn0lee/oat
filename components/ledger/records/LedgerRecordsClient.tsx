"use client";

import { useQueryClient } from "@tanstack/react-query";
import { addMonths, getYear, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AmountDisclosure,
  MetricBlock,
  MetricStrip,
  ScreenSection,
  SectionHeader,
} from "@/components/layout/screen";
import { LedgerTagFilter } from "@/components/ledger/LedgerTagFilter";
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
import { useLedgerTags } from "@/hooks/use-ledger-tags";
import {
  calculateLedgerSummary,
  type LedgerEntryWithDetails,
} from "@/lib/api/ledger";
import { formatKst, getKstToday, toKstDate } from "@/lib/date";
import { queries } from "@/lib/queries/keys";
import { formatDateISO } from "@/lib/utils/format";
import { LedgerCalendar } from "./LedgerCalendar";
import { LedgerDayEntryList } from "./LedgerDayEntryList";

const CURRENT_YEAR = getYear(new Date());
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - 5 + i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

interface LedgerRecordsClientProps {
  initialDate?: string;
  initialScope?: "shared" | "personal";
}

export function LedgerRecordsClient({
  initialDate,
  initialScope = "shared",
}: LedgerRecordsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = useMemo(
    () => toKstDate(initialDate ?? getKstToday()),
    [initialDate],
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    startOfMonth(initial),
  );
  const [selectedDate, setSelectedDate] = useState<Date>(initial);
  const [scope, setScopeState] = useState<"shared" | "personal">(initialScope);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() => {
    return searchParams.getAll("tagId");
  });

  const { data: availableTags = [] } = useLedgerTags({ scope });

  const handleTagIdsChange = useCallback(
    (nextTagIds: string[]) => {
      setSelectedTagIds(nextTagIds);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tagId");
      for (const tagId of nextTagIds) {
        params.append("tagId", tagId);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  useEffect(() => {
    if (selectedTagIds.length > 0 && availableTags.length > 0) {
      const availableIds = new Set(availableTags.map((t) => t.id));
      const nextTagIds = selectedTagIds.filter((id) => availableIds.has(id));
      if (nextTagIds.length !== selectedTagIds.length) {
        handleTagIdsChange(nextTagIds);
      }
    }
  }, [availableTags, selectedTagIds, handleTagIdsChange]);

  const handleScopeChange = (nextScope: "shared" | "personal") => {
    setScopeState(nextScope);
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", nextScope);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const queryClient = useQueryClient();

  const prevMonth = useMemo(() => subMonths(currentMonth, 1), [currentMonth]);
  const nextMonth = useMemo(() => addMonths(currentMonth, 1), [currentMonth]);

  const { data: prevEntries = [] } = useLedgerEntries({
    year: prevMonth.getFullYear(),
    month: prevMonth.getMonth() + 1,
    scope,
    tagIds: selectedTagIds,
  });
  const { data: entries = [], isLoading } = useLedgerEntries({
    year: currentMonth.getFullYear(),
    month: currentMonth.getMonth() + 1,
    scope,
    tagIds: selectedTagIds,
  });
  const { data: nextEntries = [] } = useLedgerEntries({
    year: nextMonth.getFullYear(),
    month: nextMonth.getMonth() + 1,
    scope,
    tagIds: selectedTagIds,
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
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", formatDateISO(date));
    router.replace(`${pathname}?${params.toString()}`);
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
    <ScreenSection className="mb-4">
      <SectionHeader
        title={scope === "shared" ? "공용 기록" : "내 기록"}
        action={
          <div className="rounded-full bg-gray-100 p-0.5">
            {(["shared", "personal"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleScopeChange(item)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  scope === item
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                {item === "shared" ? "공용" : "개인"}
              </button>
            ))}
          </div>
        }
      />
      <MetricStrip columns={{ base: 3 }}>
        <MetricBlock
          className="text-center"
          label="입금"
          value={
            <AmountDisclosure
              amount={summary.totalIncome}
              sign="+"
              tone="income"
              align="center"
              className="text-sm font-semibold"
            />
          }
        />
        <MetricBlock
          className="text-center"
          label="지출"
          value={
            <AmountDisclosure
              amount={summary.totalExpense}
              sign="-"
              tone="expense"
              align="center"
              className="text-sm font-semibold"
            />
          }
        />
        <MetricBlock
          className="text-center"
          label="잔액"
          value={
            <AmountDisclosure
              amount={summary.balance}
              sign={summary.balance >= 0 ? "+" : ""}
              tone={summary.balance >= 0 ? "neutral" : "expense"}
              align="center"
              className="text-sm font-semibold"
            />
          }
        />
      </MetricStrip>
    </ScreenSection>
  );

  const calendarSection = isLoading ? (
    <Skeleton className="h-72 rounded-2xl" />
  ) : (
    <div className="space-y-4">
      {availableTags.length > 0 && (
        <div className="flex justify-end px-1">
          <LedgerTagFilter
            tags={availableTags}
            selectedIds={selectedTagIds}
            onSelectedIdsChange={handleTagIdsChange}
          />
        </div>
      )}
      <LedgerCalendar
        currentMonth={currentMonth}
        onMonthChange={handleMonthChange}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        entriesByDate={entriesByDate}
        onRefresh={handleRefresh}
      />
    </div>
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
      <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-start md:gap-6">
        {/* 좌측: 요약 + 캘린더 */}
        <div className="md:w-[450px]">
          {summaryCard}
          {calendarSection}
        </div>

        {/* 우측(데스크탑) / 하단(모바일): 항목 목록 + 등록 버튼 */}
        <div className="flex flex-col gap-4 min-w-0">
          <LedgerDayEntryList
            selectedDate={selectedDate}
            entries={dayEntries}
          />
          <Button asChild className="w-full" size="icon-sm">
            <Link
              href={`/ledger/records/new/daily?date=${formatKst(selectedDate, "yyyy-MM-dd")}&scope=${scope}`}
            >
              <Plus className="w-5 h-5" />
              가계부 등록
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
