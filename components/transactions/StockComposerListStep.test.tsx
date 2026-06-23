import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import type { MultiTransactionFormData } from "@/schemas/multi-transaction-form";
import { StockComposerListStep } from "./StockComposerListStep";

vi.mock("@/components/transactions/AccountSelector", () => ({
  AccountSelector: () => (
    <div data-testid="account-selector">AccountSelector</div>
  ),
}));

vi.mock("@/components/transactions/TransactionTypeSelector", () => ({
  TransactionTypeSelector: () => (
    <div data-testid="transaction-type-selector">TransactionTypeSelector</div>
  ),
}));

vi.mock("@/components/transactions/TransactionSummary", () => ({
  TransactionSummary: () => (
    <div data-testid="transaction-summary">TransactionSummary</div>
  ),
}));

interface WrapperProps {
  children: React.ReactNode;
  defaultValues?: Partial<MultiTransactionFormData>;
}

function FormWrapper({ children, defaultValues }: WrapperProps) {
  const methods = useForm<MultiTransactionFormData>({
    defaultValues: {
      type: "buy",
      transactedAt: "2026-06-23",
      accountId: "acc-1",
      items: [],
      ...defaultValues,
    },
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

describe("StockComposerListStep", () => {
  it("종목 목록의 레이아웃, 수량/단가 디테일, 미축약 금액 및 삭제 동작을 검증한다", () => {
    const onEditItemMock = vi.fn();
    const onSubmitMock = vi.fn();

    const items = [
      {
        stock: {
          code: "BRK.B",
          name: "Berkshire Hathaway Class B",
          market: "US" as const,
          exchange: "NYSE",
        },
        quantity: "3",
        price: "495.24",
        memo: "",
        transactedAt: "2026-06-23",
        accountId: "acc-1",
      },
    ];

    render(
      <FormWrapper defaultValues={{ items }}>
        <StockComposerListStep
          mode="full"
          ownerId="owner-1"
          onEditItem={onEditItemMock}
          onSubmit={onSubmitMock}
          isSubmitting={false}
        />
      </FormWrapper>,
    );

    // Assert title is present
    expect(screen.getByText("Berkshire Hathaway Class B")).toBeInTheDocument();

    // Assert detail text includes "3주" and formatted unit price
    expect(screen.getByText(/3주/)).toBeInTheDocument();
    expect(screen.getByText(/US\$495\.24/)).toBeInTheDocument();

    // Assert subtotal is full currency text, not compact
    expect(screen.getByText("US$1,485.72")).toBeInTheDocument();

    // Assert delete button has accessible name "종목 삭제"
    const deleteButton = screen.getByRole("button", { name: "종목 삭제" });
    expect(deleteButton).toBeInTheDocument();

    // Clicking delete removes the row and does not call onEditItem
    fireEvent.click(deleteButton);
    expect(onEditItemMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Berkshire Hathaway Class B")).toBeNull();
  });
});
