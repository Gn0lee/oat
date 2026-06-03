import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import type { MultiTransactionFormData } from "@/schemas/multi-transaction-form";
import { StockComposerFormStep } from "./StockComposerFormStep";

vi.mock("@/components/transactions/AccountSelector", () => ({
  AccountSelector: () => <div>계좌 선택</div>,
}));

vi.mock("@/components/transactions/TransactionItemRow", () => ({
  TransactionItemRow: () => <div>종목 입력</div>,
}));

function renderStep(mode: "full" | "daily") {
  function Wrapper() {
    const form = useForm<MultiTransactionFormData>({
      defaultValues: {
        type: "buy",
        transactedAt: "2026-05-31",
        accountId: "account-1",
        items: [
          {
            stock: undefined,
            quantity: "",
            price: "",
            memo: "",
            transactedAt: "2026-05-31",
            accountId: "account-1",
          },
        ],
      },
    });

    return (
      <FormProvider {...form}>
        <StockComposerFormStep
          index={0}
          mode={mode}
          ownerId="user-1"
          onBack={vi.fn()}
        />
      </FormProvider>
    );
  }

  render(<Wrapper />);
}

describe("StockComposerFormStep", () => {
  it("hides transaction date input in daily mode", () => {
    renderStep("daily");

    expect(screen.queryByText("거래일")).not.toBeInTheDocument();
    expect(screen.getByText("계좌 선택")).toBeInTheDocument();
  });
});
