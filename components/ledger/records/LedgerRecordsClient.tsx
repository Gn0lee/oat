"use client";

import { useQueryClient } from "@tanstack/react-query";
import { addMonths, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  AmountDisclosure,
  MetricBlock,
  MetricStrip,
  ScreenSection,
  ScreenState,
} from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLedgerBook, useLedgerBooks } from "@/hooks/use-ledger-books";
import { useLedgerEntries } from "@/hooks/use-ledger-entries";
import { useLedgerIdentity } from "@/hooks/use-ledger-identity";
import { ApiQueryError } from "@/lib/api/client";
import { calculateLedgerSummary } from "@/lib/api/ledger";
import { formatKst, getKstToday, toKstDate } from "@/lib/date";
import { queries } from "@/lib/queries/keys";
import { formatDateISO } from "@/lib/utils/format";
import { LedgerCalendar } from "./LedgerCalendar";
import { LedgerDayEntryList } from "./LedgerDayEntryList";

interface LedgerRecordsClientProps {
  initialDate?: string;
}

function isRecordDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function LedgerRecordsClient({ initialDate }: LedgerRecordsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { userId, householdId } = useLedgerIdentity();
  const bookId = searchParams.get("book") ?? undefined;
  const fallbackDate = isRecordDate(initialDate) ? initialDate : getKstToday();
  const requestedDate = searchParams.get("date");
  const selectedDate = toKstDate(
    isRecordDate(requestedDate) ? requestedDate : fallbackDate,
  );
  const currentMonth = startOfMonth(selectedDate);
  const {
    data: books = [],
    isPending: booksPending,
    error: booksError,
  } = useLedgerBooks();
  const {
    data: book,
    isPending: bookPending,
    error: bookError,
  } = useLedgerBook(bookId ?? "");
  const enabled =
    Boolean(userId && householdId) && (!bookId || Boolean(book && !bookError));
  const categoryFilter = {
    categoryId: searchParams.get("categoryId") ?? undefined,
    childCategoryId: searchParams.get("childCategoryId") ?? undefined,
    categoryBreakdown:
      searchParams.get("categoryBreakdown") === "direct"
        ? ("direct" as const)
        : undefined,
  };
  const prevMonth = subMonths(currentMonth, 1);
  const nextMonth = addMonths(currentMonth, 1);
  const params = { bookId, enabled, ...categoryFilter };
  const { data: prevEntries = [], error: prevError } = useLedgerEntries({
    ...params,
    year: prevMonth.getFullYear(),
    month: prevMonth.getMonth() + 1,
  });
  const {
    data: entries = [],
    isLoading,
    error: entriesError,
  } = useLedgerEntries({
    ...params,
    year: currentMonth.getFullYear(),
    month: currentMonth.getMonth() + 1,
  });
  const { data: nextEntries = [], error: nextError } = useLedgerEntries({
    ...params,
    year: nextMonth.getFullYear(),
    month: nextMonth.getMonth() + 1,
  });
  const summary = useMemo(() => calculateLedgerSummary(entries), [entries]);
  const entriesByDate = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const entry of [...prevEntries, ...entries, ...nextEntries]) {
      const key = formatKst(entry.transactedAt);
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [prevEntries, entries, nextEntries]);
  const dayEntries = entriesByDate.get(formatDateISO(selectedDate)) ?? [];
  const returnTo = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`;
  const queryError =
    bookError || entriesError || prevError || nextError || booksError;
  const isUnavailable =
    bookId !== undefined &&
    queryError instanceof ApiQueryError &&
    (queryError.status === 404 || queryError.status === 400);
  const handleDateSelect = (date: Date) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("date", formatDateISO(date));
    router.replace(`${pathname}?${next}`);
  };
  const handleBookChange = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("scope");
    next.delete("date");
    next.delete("tagId");
    if (value === "all") next.delete("book");
    else next.set("book", value);
    router.push(`${pathname}${next.size ? `?${next}` : ""}`);
  };
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["ledgerBooks"] });
    void queryClient.invalidateQueries({
      queryKey: queries.ledgerEntries._def,
    });
    router.refresh();
  };
  if (userId && !householdId)
    return (
      <ScreenState
        type="empty"
        title="가구 설정이 필요해요"
        description="가구에 가입하거나 설정한 뒤 기록을 확인할 수 있어요."
        action={
          <Button asChild className="min-h-11">
            <Link href="/settings/household">가구 설정으로 이동</Link>
          </Button>
        }
      />
    );
  if (isUnavailable)
    return (
      <ScreenState
        type="error"
        title="장부를 볼 수 없음"
        description="이 장부의 기록을 볼 수 없습니다."
        action={
          <Button asChild className="min-h-11">
            <Link href="/ledger/records">전체 장부로 이동</Link>
          </Button>
        }
      />
    );
  if (queryError)
    return (
      <ScreenState
        type="error"
        title="기록을 불러올 수 없습니다"
        action={
          <Button onClick={refresh} className="min-h-11">
            다시 시도
          </Button>
        }
      />
    );
  if ((bookId && bookPending) || booksPending)
    return <Skeleton className="h-72 rounded-2xl" />;
  const archived = Boolean(book?.archivedAt);
  const canAdd = !bookId || Boolean(book && !archived);
  const addParams = new URLSearchParams({
    date: formatDateISO(selectedDate),
  });
  if (bookId && book && !archived) addParams.set("book", book.id);
  const monthLabel = `${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월`;
  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-2">
        <Select value={bookId ?? "all"} onValueChange={handleBookChange}>
          <SelectTrigger
            aria-label="조회 장부"
            className="min-h-11 min-w-0 flex-1"
          >
            <SelectValue placeholder="전체 장부" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="min-h-11">
              전체 장부
            </SelectItem>
            {books.map((item) => (
              <SelectItem key={item.id} value={item.id} className="min-h-11">
                {item.name} · {item.visibility === "shared" ? "공용" : "개인"}
                {item.archivedAt ? " · 보관" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild variant="ghost" className="size-11 shrink-0 p-0">
          <Link
            href={`${bookId ? `/ledger/books/${bookId}` : "/ledger/books"}?returnTo=${encodeURIComponent(returnTo)}`}
            aria-label={book ? `${book.name} 장부 관리` : "장부 관리"}
          >
            <Settings className="size-5" />
          </Link>
        </Button>
      </div>
      {book && (
        <output className="block text-sm text-gray-500">
          {book.visibility === "shared" ? "공용 장부" : "개인 장부"}
          {book.isDefault ? " · 기본 장부" : ""}
          {archived ? " · 보관됨 · 읽기 전용" : ""}
        </output>
      )}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          className="size-11 p-0"
          aria-label="이전 달"
          onClick={() => handleDateSelect(prevMonth)}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <span className="text-lg font-semibold">{monthLabel}</span>
        <Button
          variant="ghost"
          className="size-11 p-0"
          aria-label="다음 달"
          onClick={() => handleDateSelect(nextMonth)}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>
      {isLoading ? (
        <Skeleton className="h-16 rounded-2xl" />
      ) : (
        <ScreenSection>
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
      )}
      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,450px)_minmax(0,1fr)] md:gap-6">
        {isLoading ? (
          <Skeleton className="h-72 rounded-2xl" />
        ) : (
          <LedgerCalendar
            currentMonth={currentMonth}
            onMonthChange={handleDateSelect}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            entriesByDate={entriesByDate}
            onRefresh={refresh}
          />
        )}
        <div className="min-w-0 space-y-4">
          <LedgerDayEntryList
            selectedDate={selectedDate}
            entries={dayEntries}
            returnTo={returnTo}
          />
          {canAdd && (
            <Button asChild className="min-h-11 w-full">
              <Link href={`/ledger/records/new/daily?${addParams}`}>
                <Plus className="size-5" />
                가계부 등록
              </Link>
            </Button>
          )}
          {archived && (
            <p className="text-sm text-gray-500">
              기록을 변경하려면 장부 관리에서 재활성화해주세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
