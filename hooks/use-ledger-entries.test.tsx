import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiQueryError } from "@/lib/api/client";
import { queries } from "@/lib/queries/keys";
import {
  useCreateBatchLedgerEntries,
  useCreateLedgerEntry,
} from "./use-ledger-entries";

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
    const statsKey = queries.ledgerStats.byCategory(
      2026,
      6,
      "expense",
      "shared",
    ).queryKey;
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
