"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  GroupedList,
  ScreenSection,
  ScreenState,
} from "@/components/layout/screen";
import { LedgerEntryRow } from "@/components/ledger/records/LedgerEntryRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLedgerEntrySearch } from "@/hooks/use-ledger-entries";
import { formatKst } from "@/lib/date";

type SearchScope = "shared" | "personal";

interface LedgerSearchClientProps {
  initialQuery: string;
  initialScope: SearchScope;
}

function isValidQuery(query: string) {
  return query.trim().replace(/\s/g, "").length >= 2;
}

export function LedgerSearchClient({
  initialQuery,
  initialScope,
}: LedgerSearchClientProps) {
  const router = useRouter();
  const query = initialQuery.trim();
  const scope = initialScope;
  const [input, setInput] = useState(query);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  const restoredScroll = useRef(false);
  const search = useLedgerEntrySearch(query, scope);
  const entries = search.data?.pages.flatMap((page) => page.items) ?? [];
  const locationParams = new URLSearchParams();
  if (query) locationParams.set("q", query);
  locationParams.set("scope", scope);
  const locationKey = `/ledger/search?${locationParams.toString()}`;
  const storageKey = `ledger-search-scroll:${locationKey}`;

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

  const navigate = (nextQuery: string, nextScope: SearchScope) => {
    const normalizedQuery = nextQuery.trim();
    if (!isValidQuery(normalizedQuery)) {
      setValidationMessage("검색어를 2자 이상 입력해주세요.");
      return;
    }

    setValidationMessage(null);
    const params = new URLSearchParams({
      q: normalizedQuery,
      scope: nextScope,
    });
    router.push(`/ledger/search?${params.toString()}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(input, scope);
  };

  const handleScopeChange = (nextScope: SearchScope) => {
    if (query) {
      navigate(query, nextScope);
      return;
    }
    router.push(`/ledger/search?scope=${nextScope}`);
  };

  const rememberScroll = () => {
    sessionStorage.setItem(storageKey, String(window.scrollY));
  };

  const buildDetailHref = (entryId: string) => {
    const params = new URLSearchParams({ from: "search", q: query, scope });
    return `/ledger/records/${entryId}?${params.toString()}`;
  };

  return (
    <div className="space-y-5">
      <ScreenSection>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="search"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="제목이나 메모를 검색하세요"
              aria-label="가계부 내역 검색어"
              aria-describedby={validationMessage ? "search-error" : undefined}
              className="h-11 rounded-xl bg-white"
            />
            <Button type="submit" size="lg" aria-label="검색">
              <Search className="size-4" />
              검색
            </Button>
          </div>
          {validationMessage && (
            <p id="search-error" className="text-sm text-red-500">
              {validationMessage}
            </p>
          )}
        </form>

        <div className="mt-4 inline-flex gap-1 rounded-xl bg-gray-100 p-1">
          {(
            [
              ["shared", "공용"],
              ["personal", "개인"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => handleScopeChange(value)}
              aria-pressed={scope === value}
              className={`min-h-9 rounded-lg px-4 text-sm font-medium transition-colors ${
                scope === value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </ScreenSection>

      {!query ? (
        <ScreenState
          type="empty"
          title="과거 기록을 찾아보세요"
          description="제목이나 메모의 일부를 2자 이상 입력해주세요."
        />
      ) : !isValidQuery(query) ? (
        <ScreenState
          type="empty"
          title="검색어가 너무 짧습니다"
          description="공백을 제외하고 2자 이상 입력해주세요."
        />
      ) : search.isLoading ? (
        <ScreenState type="loading" title="내역을 검색하고 있습니다" />
      ) : search.isError ? (
        <ScreenState
          type="error"
          title="검색 결과를 불러올 수 없습니다"
          description="잠시 후 다시 시도해주세요."
        />
      ) : entries.length === 0 ? (
        <ScreenState
          type="empty"
          title="검색 결과가 없습니다"
          description="다른 제목이나 메모로 검색해보세요."
        />
      ) : (
        <div className="space-y-3">
          <GroupedList>
            {entries.map((entry) => (
              <LedgerEntryRow
                key={entry.id}
                entry={entry}
                href={buildDetailHref(entry.id)}
                dateLabel={formatKst(entry.transactedAt, "yyyy.MM.dd")}
                memoContext={
                  entry.memoMatched && entry.memo?.trim()
                    ? `메모: ${entry.memo.trim()}`
                    : undefined
                }
                onClick={rememberScroll}
              />
            ))}
          </GroupedList>

          {search.hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl"
              onClick={() => search.fetchNextPage()}
              disabled={search.isFetchingNextPage}
            >
              {search.isFetchingNextPage && (
                <Loader2 className="size-4 animate-spin" />
              )}
              더 보기
            </Button>
          ) : (
            <p className="py-2 text-center text-sm text-gray-400">
              추가 결과가 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
