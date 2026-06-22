import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { queries } from "@/lib/queries/keys";
import { useCreateLedgerEntry } from "./use-ledger-entries";

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
