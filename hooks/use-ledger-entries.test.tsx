import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiQueryError } from "@/lib/api/client";
import { queries } from "@/lib/queries/keys";
import {
  useCreateBatchLedgerEntries,
  useCreateLedgerEntry,
  useLedgerEntrySearch,
} from "./use-ledger-entries";
import { LedgerIdentityProvider } from "./use-ledger-identity";

describe("useCreateLedgerEntry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("기록 생성 후 가계부 통계와 홈 요약 cache를 invalidate한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: "entry-1" } }),
      }),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const statsKey = queries.ledgerStats.query({
      name: "by-category",
      params: { year: 2026, month: 6, type: "expense" },
      userId: "user-1",
      householdId: "household-1",
    }).queryKey;
    const homeKey = queries.home.summary({ year: 2026, month: 6 }).queryKey;
    queryClient.setQueryData(statsKey, { items: [] });
    queryClient.setQueryData(homeKey, { topCategories: [] });

    const { result } = renderHook(() => useCreateLedgerEntry(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await act(async () => {
      await result.current.mutateAsync({} as never);
    });

    expect(queryClient.getQueryState(statsKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(homeKey)?.isInvalidated).toBe(true);
  });
});

describe("useCreateBatchLedgerEntries", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the idempotency key and invalidates books, entries, stats, requests, and notifications", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: [{ id: "entry-1" }], count: 1 }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const keys = [
      ["ledgerBooks", "user-1", "household-1", "list"],
      queries.ledgerEntries.list({ bookId: "book-1" }).queryKey,
      queries.ledgerStats._def,
      queries.recordChangeRequests._def,
      queries.notifications._def,
    ];
    for (const key of keys) queryClient.setQueryData(key, []);
    const { result } = renderHook(() => useCreateBatchLedgerEntries(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    let mutationResult: { data: { id: string }[]; count: number } | undefined;
    await act(async () => {
      mutationResult = await result.current.mutateAsync({
        entries: [{} as never],
        requestId: "retry-key",
      });
    });

    expect(mutationResult).toEqual({ data: [{ id: "entry-1" }], count: 1 });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject(
      { requestId: "retry-key" },
    );
    for (const key of keys)
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
  });

  it("preserves API error code and HTTP status for mutation callers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          error: { code: "ENTRY_CHANGED", message: "stale" },
        }),
      }),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => useCreateBatchLedgerEntries(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await expect(result.current.mutateAsync([])).rejects.toMatchObject(
      new ApiQueryError("ENTRY_CHANGED", "stale", 409),
    );
  });
});

describe("useLedgerEntrySearch", () => {
  afterEach(() => vi.unstubAllGlobals());

  function setup(bookId?: string) {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { items: [], nextCursor: "c1" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { items: [], nextCursor: null } }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const hook = renderHook(() => useLedgerEntrySearch(" 커피 ", bookId), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <LedgerIdentityProvider
            value={{ userId: "user-1", householdId: "house-1", role: "member" }}
          >
            {children}
          </LedgerIdentityProvider>
        </QueryClientProvider>
      ),
    });
    return { ...hook, fetchMock, queryClient };
  }

  it("장부 범위로 첫 페이지를 조회하고 다음 페이지에 cursor를 붙인다", async () => {
    const { result, fetchMock } = setup("book-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/ledger-entries/search?q=%EC%BB%A4%ED%94%BC&book=book-1",
    );
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/ledger-entries/search?q=%EC%BB%A4%ED%94%BC&book=book-1&cursor=c1",
    );
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
  });

  it("캐시 키는 사용자·가구·장부·검색어로 나뉘고 기록 변경 시 무효화된다", async () => {
    const { result, queryClient } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const key = queries.ledgerEntries.search({
      query: "커피",
      bookId: undefined,
      userId: "user-1",
      householdId: "house-1",
    }).queryKey;
    expect(queryClient.getQueryState(key)).toBeDefined();
    expect(
      queryClient.getQueryState(
        queries.ledgerEntries.search({
          query: "커피",
          bookId: "book-1",
          userId: "user-1",
          householdId: "house-1",
        }).queryKey,
      ),
    ).toBeUndefined();

    await queryClient.invalidateQueries({
      queryKey: queries.ledgerEntries._def,
    });
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
    // refetch happened because the query was active and invalidated
    await waitFor(() =>
      expect(queryClient.getQueryState(key)?.dataUpdateCount).toBe(2),
    );
  });
});
