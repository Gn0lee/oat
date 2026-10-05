import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LedgerIdentityProvider } from "./use-ledger-identity";
import {
  useLedgerStatsByCategory,
  useLedgerStatsDetail,
  useLedgerStatsSummary,
  useLedgerStatsTrend,
} from "./use-ledger-stats";

const BOOK = "00000000-0000-4000-8000-000000000001";

function setup(userId: string, queryClient = new QueryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <LedgerIdentityProvider
        value={{ userId, householdId: "hh-1", role: "member" }}
      >
        {children}
      </LedgerIdentityProvider>
    </QueryClientProvider>
  );
  return { wrapper, queryClient };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data: {} }),
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function requestedUrl(call = 0) {
  return String(fetchMock.mock.calls[call]?.[0]);
}

describe("ledger stats hooks", () => {
  it("request the selected book and never a legacy scope", async () => {
    const { wrapper } = setup("user-a");

    const { result } = renderHook(
      () =>
        useLedgerStatsByCategory({
          year: 2026,
          month: 10,
          type: "income",
          bookId: BOOK,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestedUrl()).toBe(
      `/api/ledger/stats/by-category?year=2026&month=10&type=income&book=${BOOK}`,
    );
  });

  it("omit book for the all-books scope", async () => {
    const { wrapper } = setup("user-a");

    const { result } = renderHook(() => useLedgerStatsTrend({ months: 6 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestedUrl()).toBe("/api/ledger/stats/trend?months=6");
  });

  it("keep users and books in separate cache entries", async () => {
    const queryClient = new QueryClient();
    const first = setup("user-a", queryClient);
    const second = setup("user-b", queryClient);

    const a = renderHook(
      () => useLedgerStatsSummary({ year: 2026, month: 10 }),
      { wrapper: first.wrapper },
    );
    await waitFor(() => expect(a.result.current.isSuccess).toBe(true));
    const b = renderHook(
      () => useLedgerStatsSummary({ year: 2026, month: 10 }),
      { wrapper: second.wrapper },
    );
    await waitFor(() => expect(b.result.current.isSuccess).toBe(true));
    const c = renderHook(
      () => useLedgerStatsSummary({ year: 2026, month: 10, bookId: BOOK }),
      { wrapper: second.wrapper },
    );
    await waitFor(() => expect(c.result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(requestedUrl(2)).toBe(
      `/api/ledger/stats/summary?year=2026&month=10&book=${BOOK}`,
    );
  });

  it("send the detail conditions together with the book", async () => {
    const { wrapper } = setup("user-a");

    const { result } = renderHook(
      () =>
        useLedgerStatsDetail({
          kind: "payment-method",
          year: 2026,
          month: 10,
          paymentMethodId: "__none__",
          bookId: BOOK,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestedUrl()).toBe(
      `/api/ledger/stats/details?kind=payment-method&year=2026&month=10&paymentMethodId=__none__&book=${BOOK}`,
    );
  });
});
