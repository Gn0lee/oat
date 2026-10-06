import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { TransactionEditDialog } from "./TransactionEditDialog";

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => true,
}));

vi.mock("@/hooks/use-transaction", () => ({
  useUpdateTransaction: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/components/transactions/AccountSelector", () => ({
  AccountSelector: () => <div>계좌 선택기</div>,
}));

const transaction: TransactionWithDetails = {
  id: "tx-1",
  type: "sell",
  ticker: "AAPL",
  stockName: "Apple Inc.",
  quantity: 10,
  price: 150,
  totalAmount: 1500,
  currency: "USD",
  transactedAt: "2026-06-16T00:00:00.000Z",
  memo: "메모",
  accountId: "account-1",
  accountName: "토스증권",
  owner: { id: "owner-1", name: "홍길동" },
};

describe("TransactionEditDialog", () => {
  it("수량·단가·거래일·메모가 공통 필드 스타일을 쓴다", () => {
    render(
      <TransactionEditDialog
        transaction={transaction}
        open
        onOpenChange={vi.fn()}
      />,
    );

    for (const field of [
      screen.getByLabelText("수량"),
      screen.getByLabelText(/단가/),
      screen.getByLabelText("메모 (선택)"),
    ]) {
      expect(field).toHaveClass("min-h-11", "rounded-[12px]");
    }
    expect(screen.getByLabelText("거래일")).toHaveClass("min-h-11");
  });

  it("매도 배지는 파랑이다", () => {
    render(
      <TransactionEditDialog
        transaction={transaction}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("매도", { selector: "[data-slot=badge]" }),
    ).toHaveClass("text-[#3182F6]");
  });
});
