import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { TransactionTable } from "./TransactionTable";

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
    transactedAt: "2026-05-03T09:00:00.000Z",
    memo: null,
    accountId: "account-1",
    accountName: "삼성증권",
    owner: {
      id: "user-1",
      name: "진호",
    },
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
    transactedAt: "2026-05-03T13:00:00.000Z",
    memo: "리밸런싱",
    accountId: "account-2",
    accountName: "토스증권",
    owner: {
      id: "user-2",
      name: "배우자",
    },
  },
  {
    id: "tx-3",
    ticker: "TSLA",
    stockName: "Tesla",
    type: "buy",
    quantity: 1,
    price: 250,
    totalAmount: 250,
    currency: "USD",
    transactedAt: "2026-05-01T09:00:00.000Z",
    memo: null,
    accountId: "account-1",
    accountName: "삼성증권",
    owner: {
      id: "user-1",
      name: "진호",
    },
  },
];

describe("TransactionTable", () => {
  it("renders transactions as date-grouped collection items instead of a table", () => {
    render(
      <TransactionTable
        data={transactions}
        detailQueryString="from=transactions&page=2&type=buy"
      />,
    );

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("2026년 5월 3일")).toBeInTheDocument();
    expect(screen.getByText("2건")).toBeInTheDocument();
    expect(screen.getByText("2026년 5월 1일")).toBeInTheDocument();
    expect(screen.getByText("삼성전자")).toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Tesla")).toBeInTheDocument();
    expect(screen.getByText("10주")).toBeInTheDocument();
    expect(screen.getByText("2주")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "메뉴 열기" })).toBeNull();

    // Verify KRW formatting and title attribute
    const samsungPriceText = screen.getByText("700,000원");
    expect(samsungPriceText).toBeInTheDocument();
    expect(samsungPriceText.closest("[title]")).toHaveAttribute(
      "title",
      "700,000원",
    );

    // Verify grid layout
    const gridContainer = samsungPriceText.closest(".grid");
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveClass("grid-cols-[minmax(0,1fr)_auto]");

    // Verify USD formatting and dollar sign inclusion (supporting either US$380.00 or $380.00)
    const applePriceText = screen.getByText(/^(US)?\$380\.00$/);
    expect(applePriceText).toBeInTheDocument();
    const titleAttr =
      applePriceText.closest("[title]")?.getAttribute("title") ?? "";
    expect(titleAttr).toMatch(/^(US)?\$380\.00$/);

    expect(screen.getByRole("link", { name: /삼성전자/ })).toHaveAttribute(
      "href",
      "/assets/stock/transactions/tx-1?from=transactions&page=2&type=buy",
    );
  });

  it("shows an empty collection state when there are no transactions", () => {
    render(
      <TransactionTable data={[]} detailQueryString="from=transactions" />,
    );

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("거래 내역이 없습니다.")).toBeInTheDocument();
  });
});
