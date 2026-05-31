import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { StockRecordDayList } from "./StockRecordDayList";

vi.mock("@/components/transactions/TransactionEditDialog", () => ({
  TransactionEditDialog: () => null,
}));

vi.mock("@/components/transactions/TransactionDeleteDialog", () => ({
  TransactionDeleteDialog: () => null,
}));

const transaction: TransactionWithDetails = {
  id: "tx-1",
  ticker: "LONG",
  stockName: "아주아주아주아주아주아주아주긴종목명테스트주식회사",
  type: "buy",
  quantity: 12,
  price: 34_500,
  totalAmount: 414_000,
  currency: "KRW",
  transactedAt: "2026-05-31T09:00:00.000Z",
  memo: "목록에서는 보이면 안 되는 메모",
  accountId: "account-1",
  accountName: "삼성증권",
  owner: { id: "user-1", name: "진호" },
};

describe("StockRecordDayList", () => {
  it("renders selected-date stock transactions without memo content", () => {
    render(
      <StockRecordDayList
        selectedDate="2026-05-31"
        transactions={[transaction]}
        currentUserId="user-1"
      />,
    );

    expect(screen.getByText("2026년 5월 31일")).toBeInTheDocument();
    expect(screen.getByText("매수")).toBeInTheDocument();
    expect(screen.getByText("LONG")).toBeInTheDocument();
    expect(screen.getByText("12주")).toBeInTheDocument();
    expect(screen.getByText("₩34,500")).toBeInTheDocument();
    expect(screen.getByText("삼성증권")).toBeInTheDocument();
    expect(
      screen.queryByText("목록에서는 보이면 안 되는 메모"),
    ).not.toBeInTheDocument();
  });

  it("keeps long stock names truncatable", () => {
    render(
      <StockRecordDayList
        selectedDate="2026-05-31"
        transactions={[transaction]}
        currentUserId="user-1"
      />,
    );

    expect(screen.getByText(transaction.stockName)).toHaveClass("truncate");
  });
});
