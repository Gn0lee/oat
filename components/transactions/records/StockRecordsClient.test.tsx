import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTransactions } from "@/hooks/use-transaction";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { StockRecordsClient } from "./StockRecordsClient";

vi.mock("next/navigation", () => ({
  usePathname: () => "/assets/stock/records",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("date=2026-05-31"),
}));

vi.mock("@/hooks/use-transaction", () => ({
  useTransactions: vi.fn(),
}));

vi.mock("@/components/transactions/TransactionEditDialog", () => ({
  TransactionEditDialog: () => null,
}));

vi.mock("@/components/transactions/TransactionDeleteDialog", () => ({
  TransactionDeleteDialog: () => null,
}));

const transactions: TransactionWithDetails[] = [
  {
    id: "tx-1",
    ticker: "005930",
    stockName: "삼성전자",
    type: "buy",
    quantity: 10,
    price: 70_000,
    totalAmount: 700_000,
    currency: "KRW",
    transactedAt: "2026-05-31T09:00:00.000Z",
    memo: null,
    accountId: "account-1",
    accountName: "삼성증권",
    owner: { id: "user-1", name: "진호" },
  },
  {
    id: "tx-2",
    ticker: "AAPL",
    stockName: "Apple",
    type: "sell",
    quantity: 2,
    price: 190,
    totalAmount: 380,
    currency: "USD",
    transactedAt: "2026-05-31T13:00:00.000Z",
    memo: null,
    accountId: "account-2",
    accountName: "토스증권",
    owner: { id: "user-1", name: "진호" },
  },
];

describe("StockRecordsClient", () => {
  it("restores selected date, shows count summary, and links daily entry with date", () => {
    vi.mocked(useTransactions)
      .mockReturnValueOnce({
        data: {
          data: [],
          total: 0,
          page: 1,
          pageSize: 500,
          totalPages: 1,
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useTransactions>)
      .mockReturnValueOnce({
        data: {
          data: transactions,
          total: 2,
          page: 1,
          pageSize: 500,
          totalPages: 1,
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useTransactions>)
      .mockReturnValueOnce({
        data: {
          data: [],
          total: 0,
          page: 1,
          pageSize: 500,
          totalPages: 1,
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useTransactions>);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <StockRecordsClient initialDate="2026-05-31" />
      </QueryClientProvider>,
    );

    expect(screen.getByText("매수 1건")).toBeInTheDocument();
    expect(screen.getByText("매도 1건")).toBeInTheDocument();
    expect(screen.getByText("삼성전자")).toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /거래 등록/ })).toHaveAttribute(
      "href",
      "/assets/stock/transactions/new/daily?date=2026-05-31",
    );
  });
});
