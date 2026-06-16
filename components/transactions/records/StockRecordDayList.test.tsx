import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { StockRecordDayList } from "./StockRecordDayList";

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
      />,
    );

    expect(screen.getByText("2026년 5월 31일")).toBeInTheDocument();
    expect(screen.getByText("매수")).toBeInTheDocument();
    expect(screen.getByText("12주")).toBeInTheDocument();

    const amountText = screen.getByText("414,000원");
    expect(amountText).toBeInTheDocument();
    expect(amountText.closest("[title]")).toHaveAttribute("title", "414,000원");

    // Verify stable two-column layout classes
    const gridContainer = amountText.closest(".grid");
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveClass("grid-cols-[minmax(0,1fr)_auto]");

    expect(screen.getByText("삼성증권")).toBeInTheDocument();
    expect(
      screen.queryByText("목록에서는 보이면 안 되는 메모"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /아주아주/ })).toHaveAttribute(
      "href",
      "/assets/stock/transactions/tx-1?from=records&date=2026-05-31",
    );
  });

  it("allows long stock names to wrap across two lines", () => {
    render(
      <StockRecordDayList
        selectedDate="2026-05-31"
        transactions={[transaction]}
      />,
    );

    expect(screen.getByText(transaction.stockName)).toHaveClass("line-clamp-2");
  });
});
