import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { StockTransactionRow } from "./StockTransactionRow";

const mockTransaction: TransactionWithDetails = {
  id: "tx-1",
  type: "buy",
  stockName: "Berkshire Hathaway Class B 아주아주아주긴종목이름",
  quantity: 3,
  price: 411522.63,
  currency: "USD",
  owner: { id: "user-1", name: "진호" },
  accountName: "미래에셋",
  accountId: "acc-1",
  transactedAt: "2026-06-23T00:00:00Z",
  ticker: "BRK.B",
  totalAmount: 1234567.89,
  memo: null,
};

describe("StockTransactionRow", () => {
  it("새로운 레이아웃 계층과 미축약 금액 및 구분된 셰브론을 검증한다", () => {
    render(
      <StockTransactionRow
        href="/transactions/tx-1"
        transaction={mockTransaction}
      />,
    );

    // Assert the root link keeps the expected href
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/transactions/tx-1");

    // Assert the name is rendered with line-clamp-2
    const nameSpan = screen.getByText(
      "Berkshire Hathaway Class B 아주아주아주긴종목이름",
    );
    expect(nameSpan).toBeInTheDocument();
    expect(nameSpan).toHaveClass("line-clamp-2");

    // Assert details text is present: 3주 x US$411,522.63 · 진호 · 미래에셋
    expect(screen.getByText(/3주/)).toBeInTheDocument();
    expect(screen.getByText(/US\$411,522\.63/)).toBeInTheDocument();
    expect(screen.getByText(/진호/)).toBeInTheDocument();
    expect(screen.getByText(/미래에셋/)).toBeInTheDocument();

    // Assert the full amount is rendered and the amount element has whitespace-nowrap
    // 3 * 411522.63 = 1234567.89 -> US$1,234,567.89
    const amountText = screen.getByText("US$1,234,567.89");
    expect(amountText).toBeInTheDocument();
    expect(amountText).toHaveClass("whitespace-nowrap");

    // Assert the chevron still exists and is not in the same parent as the amount text
    const chevron = screen.getByTestId("stock-transaction-row-chevron");
    expect(chevron).toBeInTheDocument();
    expect(chevron.parentElement).not.toContain(amountText);
  });
});
