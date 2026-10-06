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
import { useEffect, useMemo, useRef, useState } from "react";
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
  isLedgerRecordMonth,
  ledgerMonthAnchorDate,
  ledgerScopeHref,
} from "@/lib/ledger-books/navigation";
import { queries } from "@/lib/queries/keys";
import { formatCurrency } from "@/lib/utils/format";
import { LedgerDateStrip } from "./LedgerDateStrip";
import { LedgerEntryRow } from "./LedgerEntryRow";

interface LedgerRecordsClientProps {
  initialDate?: string;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
// Conditions carried over from an analysis "전체 기록 보기" link.
const FILTER_PARAMS = [
  "type",
  "categoryId",
  "childCategoryId",
  "categoryBreakdown",
  "paymentMethodId",
] as const;
const TYPE_LABELS: Record<string, string> = {
  expense: "지출",
  income: "수입",
};

function dayHeading(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${day}일 ${WEEKDAYS[weekday]}요일`;
}

// Scrolls a day section to just below the sticky header.
function scrollToDay(
  list: HTMLElement | null,
  header: HTMLElement | null,
  date: string,
  behavior: ScrollBehavior,
) {
  const section = list?.querySelector<HTMLElement>(`[data-date="${date}"]`);
  if (!section) return;
  const offset = header
    ? (Number.parseFloat(getComputedStyle(header).top) || 0) +
      header.offsetHeight
    : 0;
  section.style.scrollMarginTop = `${offset}px`;
  section.scrollIntoView({ block: "start", behavior });
}

// The layout scrolls an inner container, not the window.
function scrollContainerToTop(element: HTMLElement | null) {
  for (let node = element?.parentElement; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) {
      node.scrollTo({ top: 0 });
      return;
    }
  }
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
  const urlDate = isLedgerRecordDate(requestedDate) ? requestedDate : null;
  const requestedMonth = searchParams.get("month");
  const monthKey =
    urlDate?.slice(0, 7) ??
    (isLedgerRecordMonth(requestedMonth)
      ? requestedMonth
      : (isLedgerRecordDate(initialDate) ? initialDate : today).slice(0, 7));
  const [year, month] = monthKey.split("-").map(Number);
  const [tappedDate, setTappedDate] = useState<string | null>(null);
  const [scrollRequest, setScrollRequest] = useState<{ date: string } | null>(
    null,
  );
  const stickyRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const hasEnteredRef = useRef(false);
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
    type: searchParams.get("type") ?? undefined,
    paymentMethodId: searchParams.get("paymentMethodId") ?? undefined,
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
  const recordDays = useMemo(
    () => [...entriesByDate.keys()].sort().reverse(),
    [entriesByDate],
  );
  const activeTappedDate = tappedDate?.startsWith(`${monthKey}-`)
    ? tappedDate
    : null;
  const selectedDate =
    activeTappedDate ??
    urlDate ??
    recordDays[0] ??
    ledgerMonthAnchorDate(year, month, today);
  // Every day with records, newest first. A tapped day without records gets a
  // temporary empty section in its place.
  const dayGroups = useMemo(() => {
    const days =
      activeTappedDate && !entriesByDate.has(activeTappedDate)
        ? [...recordDays, activeTappedDate].sort().reverse()
        : recordDays;
    return days.map((date) => ({
      date,
      entries: entriesByDate.get(date) ?? [],
    }));
  }, [activeTappedDate, entriesByDate, recordDays]);

  const filterLabel = useMemo(() => {
    const parts: string[] = [];
    const type = searchParams.get("type");
    if (type) parts.push(TYPE_LABELS[type] ?? "선택한 유형");
    const categoryId =
      searchParams.get("childCategoryId") ?? searchParams.get("categoryId");
    if (categoryId === "__none__") parts.push("미분류");
    else if (categoryId)
      parts.push(
        entries.find((entry) => entry.categoryId === categoryId)
          ?.categoryName ?? "선택한 분류",
      );
    const paymentMethodId = searchParams.get("paymentMethodId");
    if (paymentMethodId === "__none__") parts.push("결제수단 없음");
    else if (paymentMethodId)
      parts.push(
        entries.find((entry) => entry.fromPaymentMethodId === paymentMethodId)
          ?.fromPaymentMethodName ?? "선택한 결제수단",
      );
    return parts.join(" · ");
  }, [entries, searchParams]);

  const returnTo = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`;
  const queryError = bookError || entriesError || booksError;
  const isUnavailable =
    bookId !== undefined &&
    queryError instanceof ApiQueryError &&
    (queryError.status === 404 || queryError.status === 400);

  const isListReady =
    enabled &&
    !isLoading &&
    !queryError &&
    !booksPending &&
    !(bookId && bookPending);

  // Entering with a date opens the list at that day; otherwise at the top.
  useEffect(() => {
    if (!isListReady || hasEnteredRef.current) return;
    hasEnteredRef.current = true;
    if (urlDate)
      scrollToDay(listRef.current, stickyRef.current, urlDate, "auto");
  }, [isListReady, urlDate]);

  useEffect(() => {
    if (scrollRequest)
      scrollToDay(
        listRef.current,
        stickyRef.current,
        scrollRequest.date,
        "smooth",
      );
  }, [scrollRequest]);

  // The calendar's expanded state is local to the strip; drop any legacy
  // `view` param whenever the URL is rewritten.
  const nextParams = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("view");
    return next;
  };
  const replaceParams = (update: (next: URLSearchParams) => void) => {
    const next = nextParams();
    update(next);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`);
  };
  // Tapping a day only rewrites the URL; the month's data is already loaded.
  const handleDateSelect = (date: string) => {
    setTappedDate(date);
    setScrollRequest({ date });
    const next = nextParams();
    next.delete("month");
    next.set("date", date);
    window.history.replaceState(null, "", `${pathname}?${next}`);
  };
  const handleMonthMove = (offset: number) => {
    const target = new Date(Date.UTC(year, month - 1 + offset, 1))
      .toISOString()
      .slice(0, 7);
    setTappedDate(null);
    const next = nextParams();
    next.delete("date");
    next.set("month", target);
    router.replace(`${pathname}?${next}`, { scroll: false });
    scrollContainerToTop(stickyRef.current);
  };
  const handleBookChange = (nextBookId: string | undefined) => {
    const next = nextParams();
    next.delete("scope");
    next.delete("date");
    next.delete("month");
    next.delete("tagId");
    if (nextBookId) next.set("book", nextBookId);
    else next.delete("book");
    setTappedDate(null);
    router.push(`${pathname}${next.size ? `?${next}` : ""}`);
  };
  const clearFilters = () =>
    replaceParams((next) => {
      for (const key of FILTER_PARAMS) next.delete(key);
    });
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
        title="기록을 불러오지 못했어요"
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

  return (
    <div className="pb-24">
      {/* Sticks to the top of the layout's scroll container. The mobile app
          header scrolls away with the list on this screen, so it only pushes
          the sticky area down at scroll position 0. The negative margins
          cover the layout's side padding. */}
      <div
        ref={stickyRef}
        className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 space-y-3 bg-gray-50 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      >
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

        {filterLabel && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 pl-4">
            <output className="min-w-0 truncate text-sm text-gray-700">
              {filterLabel}
            </output>
            <Button
              variant="ghost"
              className="min-h-11 shrink-0 text-sm text-gray-500"
              onClick={clearFilters}
            >
              조건 해제
            </Button>
          </div>
        )}

        {isLoading ? (
          <Skeleton className="h-24 rounded-2xl" />
        ) : (
          <LedgerDateStrip
            selectedDate={selectedDate}
            today={today}
            entriesByDate={entriesByDate}
            onSelect={handleDateSelect}
          />
        )}
      </div>

      <div className="space-y-3 pt-4">
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
                      value={`${amount > 0 ? sign : ""}${formatCurrency(amount)}`}
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

        {book && (
          <output className="block text-sm text-gray-500">
            {book.visibility === "shared" ? "공용 장부" : "개인 장부"}
            {book.isDefault ? " · 기본" : ""}
            {archived && (
              <>
                {" · 보관됨 · 읽기 전용"}
                <span className="block">
                  기록을 바꾸려면 장부 관리에서 다시 활성화해주세요.
                </span>
              </>
            )}
          </output>
        )}
      </div>

      <div ref={listRef} className="mt-4 border-t border-gray-100 pt-2">
        {isLoading ? (
          <Skeleton className="mt-4 h-40 rounded-2xl" />
        ) : dayGroups.length === 0 ? (
          <ScreenState
            type="empty"
            title={`${monthLabel} 기록이 없어요`}
            description={
              canAdd ? "+ 버튼으로 이 달의 기록을 추가해보세요." : undefined
            }
            className="mt-4"
          />
        ) : (
          dayGroups.map((group) => (
            <section key={group.date} data-date={group.date} className="pt-4">
              <h3 className="text-sm text-gray-500">
                {dayHeading(group.date)}
              </h3>
              {group.entries.length === 0 ? (
                <p className="py-4 text-sm text-gray-500">기록이 없어요</p>
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
          ))
        )}
      </div>

      {canAdd && (
        // 16px above the mobile tab bar (h-16 + safe area); bottom-right of
        // the content area on desktop.
        <Button
          asChild
          className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 size-14 rounded-full p-0 shadow-lg lg:right-8 lg:bottom-8"
        >
          <Link
            href={`/ledger/records/new/daily?${addParams}`}
            aria-label="기록 추가"
          >
            <Plus className="size-6" aria-hidden="true" />
          </Link>
        </Button>
      )}
    </div>
  );
}
