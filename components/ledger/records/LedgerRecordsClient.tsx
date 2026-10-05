"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { AmountText, ScreenState } from "@/components/layout/screen";
import { LedgerBookChips } from "@/components/ledger/scope/LedgerBookChips";
import { LedgerBookUnavailable } from "@/components/ledger/scope/LedgerBookUnavailable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLedgerBook, useLedgerBooks } from "@/hooks/use-ledger-books";
import { useLedgerEntries } from "@/hooks/use-ledger-entries";
import { useLedgerIdentity } from "@/hooks/use-ledger-identity";
import { ApiQueryError } from "@/lib/api/client";
import { calculateLedgerSummary } from "@/lib/api/ledger";
import { formatKst, getKstToday } from "@/lib/date";
import {
  isLedgerRecordDate,
  ledgerMonthAnchorDate,
  ledgerScopeHref,
} from "@/lib/ledger-books/navigation";
import { queries } from "@/lib/queries/keys";
import { formatCurrency } from "@/lib/utils/format";
import { type LedgerCalendarView, LedgerDateStrip } from "./LedgerDateStrip";
import { LedgerEntryRow } from "./LedgerEntryRow";

interface LedgerRecordsClientProps {
  initialDate?: string;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function dayHeading(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${day}일 ${WEEKDAYS[weekday]}요일`;
}

export function LedgerRecordsClient({ initialDate }: LedgerRecordsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { userId, householdId } = useLedgerIdentity();
  const bookId = searchParams.get("book") ?? undefined;
  const today = getKstToday();
  const requestedDate = searchParams.get("date");
  const selectedDate = isLedgerRecordDate(requestedDate)
    ? requestedDate
    : isLedgerRecordDate(initialDate)
      ? initialDate
      : today;
  const [year, month] = selectedDate.split("-").map(Number);
  const view: LedgerCalendarView =
    searchParams.get("view") === "month" ? "month" : "week";
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
  const {
    data: entries = [],
    isLoading,
    error: entriesError,
  } = useLedgerEntries({
    bookId,
    enabled,
    year,
    month,
    categoryId: searchParams.get("categoryId") ?? undefined,
    childCategoryId: searchParams.get("childCategoryId") ?? undefined,
    categoryBreakdown:
      searchParams.get("categoryBreakdown") === "direct" ? "direct" : undefined,
  });
  const summary = useMemo(() => calculateLedgerSummary(entries), [entries]);
  const entriesByDate = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const entry of entries) {
      const key = formatKst(entry.transactedAt);
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    return map;
  }, [entries]);
  // The selected day first, then earlier days of the month (newest first).
  const dayGroups = useMemo(() => {
    const days = [...entriesByDate.keys()]
      .filter((key) => key < selectedDate)
      .sort()
      .reverse();
    return [selectedDate, ...days].map((date) => ({
      date,
      entries: entriesByDate.get(date) ?? [],
    }));
  }, [entriesByDate, selectedDate]);

  const returnTo = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`;
  const queryError = bookError || entriesError || booksError;
  const isUnavailable =
    bookId !== undefined &&
    queryError instanceof ApiQueryError &&
    (queryError.status === 404 || queryError.status === 400);

  const replaceParams = (update: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams.toString());
    update(next);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`);
  };
  const handleDateSelect = (date: string) =>
    replaceParams((next) => next.set("date", date));
  const handleMonthMove = (offset: number) =>
    handleDateSelect(ledgerMonthAnchorDate(year, month + offset, today));
  const handleViewChange = (nextView: LedgerCalendarView) =>
    replaceParams((next) => {
      next.set("date", selectedDate);
      if (nextView === "month") next.set("view", "month");
      else next.delete("view");
    });
  const handleBookChange = (nextBookId: string | undefined) => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("scope");
    next.delete("date");
    next.delete("tagId");
    if (nextBookId) next.set("book", nextBookId);
    else next.delete("book");
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
  if (isUnavailable) return <LedgerBookUnavailable href="/ledger/records" />;
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
  const addParams = new URLSearchParams({ date: selectedDate });
  if (bookId && book && !archived) addParams.set("book", book.id);
  const currentYear = Number(today.slice(0, 4));
  const monthLabel =
    year === currentYear ? `${month}월` : `${year}년 ${month}월`;
  const prevMonthNumber = month === 1 ? 12 : month - 1;

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="size-11 p-0"
            aria-label="이전 달"
            onClick={() => handleMonthMove(-1)}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <span className="min-w-14 text-center text-xl font-bold">
            {monthLabel}
          </span>
          <Button
            variant="ghost"
            className="size-11 p-0"
            aria-label="다음 달"
            onClick={() => handleMonthMove(1)}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
        <div className="flex items-center">
          <Button asChild variant="ghost" className="size-11 p-0">
            <Link
              href={ledgerScopeHref("/ledger/search", bookId)}
              aria-label="내역 검색"
            >
              <Search className="size-5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="size-11 p-0">
            <Link
              href={`${bookId ? `/ledger/books/${bookId}` : "/ledger/books"}?returnTo=${encodeURIComponent(returnTo)}`}
              aria-label={book ? `${book.name} 장부 관리` : "장부 관리"}
            >
              <Settings className="size-5" />
            </Link>
          </Button>
        </div>
      </div>

      <LedgerBookChips
        books={books}
        selectedBookId={bookId}
        onSelect={handleBookChange}
      />

      {book && (
        <output className="block text-sm text-gray-500">
          {book.visibility === "shared" ? "공용 장부" : "개인 장부"}
          {book.isDefault ? " · 기본" : ""}
          {archived ? " · 보관됨 · 읽기 전용" : ""}
        </output>
      )}

      {isLoading ? (
        <Skeleton className="h-16 rounded-2xl" />
      ) : (
        <div>
          <dl className="grid grid-cols-2 gap-4">
            {(
              [
                ["지출", summary.totalExpense, "-"],
                ["수입", summary.totalIncome, "+"],
              ] as const
            ).map(([label, amount, sign]) => (
              <div key={label}>
                <dt className="text-sm text-gray-500">{label}</dt>
                <dd>
                  <AmountText
                    value={`${sign}${formatCurrency(amount)}`}
                    align="left"
                    className="text-2xl font-bold"
                  />
                </dd>
              </div>
            ))}
          </dl>
          <Link
            href={ledgerScopeHref("/ledger/analysis", bookId)}
            className="mt-3 inline-flex min-h-11 items-center text-sm text-gray-500"
          >
            분석 보기
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : (
        <LedgerDateStrip
          selectedDate={selectedDate}
          today={today}
          view={view}
          entriesByDate={entriesByDate}
          onSelect={handleDateSelect}
          onViewChange={handleViewChange}
        />
      )}

      <div className="border-t border-gray-100 pt-2">
        {dayGroups.map((group) => (
          <section key={group.date} className="pt-4">
            <h3 className="text-sm text-gray-500">{dayHeading(group.date)}</h3>
            {group.entries.length === 0 ? (
              <p className="py-4 text-sm text-gray-400">기록이 없어요</p>
            ) : (
              <ul>
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    <LedgerEntryRow
                      entry={entry}
                      href={`/ledger/records/${entry.id}?from=records&date=${selectedDate}&returnTo=${encodeURIComponent(returnTo)}`}
                      showBook={!bookId}
                      currentUserId={userId}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="space-y-2">
        {canAdd && (
          <Button asChild className="min-h-12 w-full rounded-xl text-base">
            <Link href={`/ledger/records/new/daily?${addParams}`}>
              <Plus className="size-5" />
              기록 추가
            </Link>
          </Button>
        )}
        {archived && (
          <p className="text-center text-sm text-gray-500">
            기록을 바꾸려면 장부 관리에서 다시 활성화해주세요.
          </p>
        )}
        <Button
          variant="secondary"
          className="min-h-12 w-full rounded-xl text-base"
          onClick={() => handleMonthMove(-1)}
        >
          {prevMonthNumber}월 기록 보기
        </Button>
      </div>
    </div>
  );
}
