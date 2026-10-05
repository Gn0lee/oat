"use client";

import { CalendarDays, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ScreenState } from "@/components/layout/screen";
import { LedgerEntryRow } from "@/components/ledger/records/LedgerEntryRow";
import { LedgerBookChips } from "@/components/ledger/scope/LedgerBookChips";
import { LedgerBookUnavailable } from "@/components/ledger/scope/LedgerBookUnavailable";
import { Button } from "@/components/ui/button";
import { useLedgerBook, useLedgerBooks } from "@/hooks/use-ledger-books";
import { useLedgerEntrySearch } from "@/hooks/use-ledger-entries";
import { useLedgerIdentity } from "@/hooks/use-ledger-identity";
import { ApiQueryError } from "@/lib/api/client";
import { formatKst } from "@/lib/date";
import { ledgerScopeHref } from "@/lib/ledger-books/navigation";

interface LedgerSearchClientProps {
  initialQuery: string;
  initialBookId?: string;
}

function isValidQuery(query: string) {
  return query.trim().replace(/\s/g, "").length >= 2;
}

function isUnavailableError(error: unknown) {
  return (
    error instanceof ApiQueryError &&
    (error.status === 404 || error.status === 400)
  );
}

export function LedgerSearchClient({
  initialQuery,
  initialBookId,
}: LedgerSearchClientProps) {
  const router = useRouter();
  const { userId } = useLedgerIdentity();
  const query = initialQuery.trim();
  const bookId = initialBookId || undefined;
  const [input, setInput] = useState(query);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  const restoredScroll = useRef(false);
  const { data: books = [] } = useLedgerBooks();
  const { data: book, error: bookError } = useLedgerBook(bookId ?? "");
  const search = useLedgerEntrySearch(query, bookId);
  const entries = search.data?.pages.flatMap((page) => page.items) ?? [];
  const searchHref = (nextQuery: string, nextBookId: string | undefined) =>
    ledgerScopeHref(
      "/ledger/search",
      nextBookId,
      nextQuery ? { q: nextQuery } : undefined,
    );
  const storageKey = `ledger-search-scroll:${searchHref(query, bookId)}`;

  useEffect(() => {
    setInput(query);
    setValidationMessage(null);
    restoredScroll.current = false;
  }, [query]);

  useEffect(() => {
    if (restoredScroll.current || entries.length === 0) return;
    const savedPosition = sessionStorage.getItem(storageKey);
    if (!savedPosition) return;

    restoredScroll.current = true;
    requestAnimationFrame(() => window.scrollTo(0, Number(savedPosition)));
  }, [entries.length, storageKey]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuery = input.trim();
    if (!isValidQuery(normalizedQuery)) {
      setValidationMessage("검색어를 2자 이상 입력해주세요.");
      return;
    }
    setValidationMessage(null);
    router.push(searchHref(normalizedQuery, bookId));
  };

  // Changing the book keeps the submitted query and restarts from page one.
  const handleBookChange = (nextBookId: string | undefined) =>
    router.push(searchHref(query, nextBookId));

  const rememberScroll = () => {
    sessionStorage.setItem(storageKey, String(window.scrollY));
  };

  const buildDetailHref = (entryId: string) =>
    `/ledger/records/${entryId}?${new URLSearchParams({
      from: "search",
      q: query,
      ...(bookId && { book: bookId }),
    })}`;

  if (
    bookId &&
    (isUnavailableError(bookError) || isUnavailableError(search.error))
  )
    return <LedgerBookUnavailable href={searchHref(query, undefined)} />;

  return (
    <div className="space-y-4 pb-6">
      <form onSubmit={handleSubmit} className="flex items-center gap-1">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500"
          />
          <input
            type="search"
            enterKeyHint="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="제목이나 메모로 찾기"
            aria-label="가계부 내역 검색어"
            aria-describedby={validationMessage ? "search-error" : undefined}
            className="h-11 w-full rounded-xl bg-gray-100 pr-3 pl-9 text-base outline-none placeholder:text-gray-600 focus-visible:ring-2 focus-visible:ring-gray-300"
          />
        </div>
        <Button asChild variant="ghost" className="size-11 shrink-0 p-0">
          <Link
            href={ledgerScopeHref("/ledger/records", bookId)}
            aria-label="달력 보기"
          >
            <CalendarDays className="size-5" />
          </Link>
        </Button>
      </form>
      {validationMessage && (
        <p id="search-error" role="alert" className="text-sm text-red-600">
          {validationMessage}
        </p>
      )}

      <LedgerBookChips
        books={books}
        selectedBookId={bookId}
        onSelect={handleBookChange}
      />

      {book?.archivedAt && (
        <output className="block text-sm text-gray-500">
          보관됨 · 읽기 전용
        </output>
      )}

      {!isValidQuery(query) ? (
        <p className="py-10 text-center text-sm text-gray-500">
          제목이나 메모를 2자 이상 입력해 찾아보세요.
        </p>
      ) : search.isLoading ? (
        <ScreenState type="loading" title="내역을 찾고 있어요" />
      ) : search.isError ? (
        <ScreenState
          type="error"
          title="검색 결과를 불러오지 못했어요"
          description="잠시 후 다시 시도해주세요."
        />
      ) : entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">
          검색 결과가 없어요.
        </p>
      ) : (
        <div>
          <ul>
            {entries.map((entry) => (
              <li key={entry.id}>
                <LedgerEntryRow
                  entry={entry}
                  href={buildDetailHref(entry.id)}
                  dateLabel={formatKst(entry.transactedAt, "yyyy.MM.dd")}
                  memoContext={
                    entry.memoMatched && entry.memo?.trim()
                      ? `메모: ${entry.memo.trim()}`
                      : undefined
                  }
                  showBook={!bookId}
                  currentUserId={userId}
                  onClick={rememberScroll}
                />
              </li>
            ))}
          </ul>

          {search.hasNextPage && (
            <Button
              type="button"
              variant="secondary"
              className="mt-4 min-h-12 w-full rounded-xl text-base"
              onClick={() => search.fetchNextPage()}
              disabled={search.isFetchingNextPage}
            >
              {search.isFetchingNextPage && (
                <Loader2 className="size-4 animate-spin" />
              )}
              더 보기
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
