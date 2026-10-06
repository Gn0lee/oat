"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ChartPie,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

// A header this far below the sticky area's bottom edge still counts as
// caught, so a header scrolled exactly to the edge is the selected one.
const SYNC_LINE_SLACK = 8;
// A programmatic scroll is over once the container stops scrolling this long.
const SCROLL_IDLE_MS = 150;
const SCROLL_START_MS = 300;
// How far past the end of the list a drag must go to open the previous month.
const PULL_THRESHOLD = 72;

// Bottom edge of the sticky header, relative to the scroll container.
function stickyBottom(header: HTMLElement | null) {
  return header
    ? (Number.parseFloat(getComputedStyle(header).top) || 0) +
        header.offsetHeight
    : 0;
}

// Scrolls a day section to just below the sticky header.
function scrollToDay(
  list: HTMLElement | null,
  header: HTMLElement | null,
  date: string,
  behavior: ScrollBehavior,
) {
  const section = list?.querySelector<HTMLElement>(`[data-date="${date}"]`);
  if (!section) return false;
  section.style.scrollMarginTop = `${stickyBottom(header)}px`;
  section.scrollIntoView({ block: "start", behavior });
  return true;
}

// Holds scroll sync (`holdRef` is set) until the container stops scrolling.
function holdScrollSync(
  container: HTMLElement | null,
  holdRef: RefObject<(() => void) | null>,
) {
  holdRef.current?.();
  let timer: ReturnType<typeof setTimeout>;
  const release = () => {
    clearTimeout(timer);
    container?.removeEventListener("scroll", handleScroll);
    container?.removeEventListener("scrollend", release);
    if (holdRef.current === release) holdRef.current = null;
  };
  const handleScroll = () => {
    clearTimeout(timer);
    timer = setTimeout(release, SCROLL_IDLE_MS);
  };
  timer = setTimeout(release, SCROLL_START_MS);
  container?.addEventListener("scroll", handleScroll);
  container?.addEventListener("scrollend", release);
  holdRef.current = release;
}

// Scrolls to a day without letting scroll sync overwrite the selection.
function scrollToDayHoldingSync(
  list: HTMLElement | null,
  header: HTMLElement | null,
  holdRef: RefObject<(() => void) | null>,
  date: string,
  behavior: ScrollBehavior,
) {
  holdScrollSync(findScrollContainer(header), holdRef);
  if (!scrollToDay(list, header, date, behavior)) holdRef.current?.();
}

// A URL carries either the selected day or, at the list's top, its month.
function setDateParams(
  params: URLSearchParams,
  date: string | null,
  monthKey: string,
) {
  if (date) {
    params.delete("month");
    params.set("date", date);
  } else {
    params.delete("date");
    params.set("month", monthKey);
  }
}

// The layout scrolls an inner container, not the window.
function findScrollContainer(element: HTMLElement | null) {
  for (let node = element?.parentElement; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return null;
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
  // The header caught just below the sticky area while the user scrolls.
  const [syncedDate, setSyncedDate] = useState<string | null>(null);
  // Scrolled back above every header: the URL drops its date.
  const [isScrolledToTop, setIsScrolledToTop] = useState(false);
  const [scrollRequest, setScrollRequest] = useState<{ date: string } | null>(
    null,
  );
  const stickyRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const hasEnteredRef = useRef(false);
  // Set while a scroll we started (entering, tapping a day) is running, so
  // scroll sync doesn't overwrite the selection mid-way.
  const releaseScrollHoldRef = useRef<(() => void) | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  // Dragged far enough past the list's end that letting go moves a month back.
  const [isPullReady, setIsPullReady] = useState(false);
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
  const activeSyncedDate = syncedDate?.startsWith(`${monthKey}-`)
    ? syncedDate
    : null;
  // The date the URL carries right now (tap and sync rewrite it quietly).
  const currentDate =
    activeTappedDate ??
    (isScrolledToTop ? null : (activeSyncedDate ?? urlDate));
  const selectedDate =
    currentDate ?? recordDays[0] ?? ledgerMonthAnchorDate(year, month, today);
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

  const returnParams = new URLSearchParams(searchParams.toString());
  if (currentDate !== urlDate) {
    returnParams.delete("view");
    setDateParams(returnParams, currentDate, monthKey);
  }
  const returnTo = `${pathname}${returnParams.size ? `?${returnParams}` : ""}`;
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

  useEffect(() => () => releaseScrollHoldRef.current?.(), []);
  useEffect(() => setPortalRoot(document.body), []);

  // Entering with a date opens the list at that day; otherwise at the top.
  useEffect(() => {
    if (!isListReady || hasEnteredRef.current) return;
    hasEnteredRef.current = true;
    if (urlDate)
      scrollToDayHoldingSync(
        listRef.current,
        stickyRef.current,
        releaseScrollHoldRef,
        urlDate,
        "auto",
      );
  }, [isListReady, urlDate]);

  useEffect(() => {
    if (scrollRequest)
      scrollToDayHoldingSync(
        listRef.current,
        stickyRef.current,
        releaseScrollHoldRef,
        scrollRequest.date,
        "smooth",
      );
  }, [scrollRequest]);

  // Scroll sync: the selection follows the last header that has scrolled up
  // to the bottom edge of the sticky area. The handler lives in a ref so the
  // observer sees the latest selection without being recreated every render.
  const syncToHeaderRef = useRef((_date: string | null) => {});
  useEffect(() => {
    syncToHeaderRef.current = (date: string | null) => {
      if (releaseScrollHoldRef.current || date === currentDate) return;
      if (date !== activeTappedDate) setTappedDate(null);
      setSyncedDate(date);
      setIsScrolledToTop(date === null);
      const next = nextParams();
      setDateParams(next, date, monthKey);
      window.history.replaceState(null, "", `${pathname}?${next}`);
    };
  });
  const dayKeys = dayGroups.map((group) => group.date).join(",");
  useEffect(() => {
    const list = listRef.current;
    if (!isListReady || !dayKeys || !list) return;
    const line = stickyBottom(stickyRef.current) + SYNC_LINE_SLACK;
    const isAbove = new Map<Element, boolean>();
    let isInitial = true;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          isAbove.set(
            entry.target,
            entry.boundingClientRect.top < (entry.rootBounds?.top ?? line),
          );
        // The first notification only reports where things already are.
        if (isInitial) {
          isInitial = false;
          return;
        }
        const top = headers.findLast((header) => isAbove.get(header));
        syncToHeaderRef.current(top?.closest("section")?.dataset.date ?? null);
      },
      {
        root: findScrollContainer(list),
        rootMargin: `-${line}px 0px 0px 0px`,
        threshold: [0, 1],
      },
    );
    // Newest first, so the last header above the line is the caught one.
    const headers = [...list.querySelectorAll("section[data-date] > h3")];
    for (const header of headers) observer.observe(header);
    return () => observer.disconnect();
  }, [dayKeys, isListReady]);

  // Dragging up past the end of the list and letting go opens the previous
  // month. Only a finger drag counts, so momentum scrolling into the end
  // never moves the month on its own.
  const moveToPreviousMonthRef = useRef(() => {});
  useEffect(() => {
    moveToPreviousMonthRef.current = () => handleMonthMove(-1);
  });
  useEffect(() => {
    const container = findScrollContainer(listRef.current);
    if (!isListReady || !container) return;
    const isAtEnd = () =>
      container.scrollTop + container.clientHeight >=
      container.scrollHeight - 1;
    let startY: number | null = null;
    let isReady = false;
    const setReady = (next: boolean) => {
      if (next === isReady) return;
      isReady = next;
      setIsPullReady(next);
    };
    const handleStart = (event: TouchEvent) => {
      startY = isAtEnd() ? event.touches[0].clientY : null;
    };
    const handleMove = (event: TouchEvent) => {
      const y = event.touches[0].clientY;
      // A drag that scrolls into the end starts counting from there.
      if (startY === null) {
        if (isAtEnd()) startY = y;
        return;
      }
      setReady(startY - y >= PULL_THRESHOLD);
    };
    const handleEnd = () => {
      if (isReady) moveToPreviousMonthRef.current();
      startY = null;
      setReady(false);
    };
    container.addEventListener("touchstart", handleStart, { passive: true });
    container.addEventListener("touchmove", handleMove, { passive: true });
    container.addEventListener("touchend", handleEnd);
    container.addEventListener("touchcancel", handleEnd);
    return () => {
      container.removeEventListener("touchstart", handleStart);
      container.removeEventListener("touchmove", handleMove);
      container.removeEventListener("touchend", handleEnd);
      container.removeEventListener("touchcancel", handleEnd);
    };
  }, [isListReady]);

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
    setIsScrolledToTop(false);
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
    setSyncedDate(null);
    setIsScrolledToTop(false);
    const next = nextParams();
    next.delete("date");
    next.set("month", target);
    router.replace(`${pathname}?${next}`, { scroll: false });
    findScrollContainer(stickyRef.current)?.scrollTo({ top: 0 });
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
    setSyncedDate(null);
    setIsScrolledToTop(false);
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
  if (booksPending) return <Skeleton className="h-72 rounded-2xl" />;

  const isBookLoading = Boolean(bookId && bookPending);
  const archived = Boolean(book?.archivedAt);
  const canAdd = !bookId || Boolean(book && !archived);
  const addParams = new URLSearchParams({ date: selectedDate });
  if (bookId && book && !archived) addParams.set("book", book.id);
  const currentYear = Number(today.slice(0, 4));
  const labelMonth = (labelYear: number, labelMonthNumber: number) =>
    labelYear === currentYear
      ? `${labelMonthNumber}월`
      : `${labelYear}년 ${labelMonthNumber}월`;
  const monthLabel = labelMonth(year, month);
  const previousMonthLabel =
    month === 1 ? labelMonth(year - 1, 12) : labelMonth(year, month - 1);

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
                href={ledgerScopeHref("/ledger/analysis", bookId)}
                aria-label="분석 보기"
              >
                <ChartPie className="size-5" />
              </Link>
            </Button>
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

        {/* Month totals sit under the month they belong to. Fixed height so
            loading doesn't shift the sticky area. */}
        <dl className="-mt-2 flex h-5 items-center gap-4 text-sm">
          {(
            [
              ["지출", summary.totalExpense, "-"],
              ["수입", summary.totalIncome, "+"],
            ] as const
          ).map(([label, amount, sign]) => (
            <div key={label} className="flex items-center gap-1.5">
              <dt className="text-gray-500">{label}</dt>
              <dd>
                {isLoading || isBookLoading ? (
                  <Skeleton className="h-4 w-16 rounded" />
                ) : (
                  <AmountText
                    value={`${amount > 0 ? sign : ""}${formatCurrency(amount)}`}
                    align="left"
                  />
                )}
              </dd>
            </div>
          ))}
        </dl>

        <LedgerBookChips
          books={books}
          selectedBookId={bookId}
          onSelect={handleBookChange}
        />

        {!isBookLoading && filterLabel && (
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

        {isLoading || isBookLoading ? (
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

      {/* Keep the chips mounted while the picked book loads so focus stays on them. */}
      {isBookLoading ? (
        <Skeleton className="mt-4 h-72 rounded-2xl" />
      ) : (
        <>
          {book && (
            <output className="mt-4 block text-sm text-gray-500">
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
                <section
                  key={group.date}
                  data-date={group.date}
                  className="pt-4"
                >
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

          {!isLoading && (
            <button
              type="button"
              onClick={() => handleMonthMove(-1)}
              className="mt-8 flex min-h-11 w-full items-center justify-center gap-1 text-sm text-gray-500"
            >
              {isPullReady
                ? `놓으면 ${previousMonthLabel}로 이동`
                : `${previousMonthLabel} 내역 보기`}
              <ChevronDown className="size-4" aria-hidden="true" />
            </button>
          )}

          {canAdd &&
            portalRoot &&
            // Portaled to body: the page transition wrapper can leave a
            // transform behind, which would pin a fixed button to the end of
            // the page instead of the viewport. 16px above the mobile tab bar
            // (h-16 + safe area); bottom-right of the content area on desktop.
            createPortal(
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
              </Button>,
              portalRoot,
            )}
        </>
      )}
    </div>
  );
}
