import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import type { TransactionItemFormData } from "@/schemas/multi-transaction-form";
import { TransactionItemRow } from "./TransactionItemRow";

vi.mock("@/components/stocks/StockSearchDialog", () => ({
  StockSearchDialog: () => null,
}));

function Harness({ prominent }: { prominent?: boolean }) {
  const { control } = useForm<{ items: TransactionItemFormData[] }>({
    defaultValues: {
      items: [{ stock: null, quantity: "", price: "" } as never],
    },
  });
  return (
    <TransactionItemRow index={0} control={control} prominent={prominent} />
  );
}

describe("TransactionItemRow", () => {
  it("keeps compact inputs at 16px on mobile so iOS does not zoom on focus", () => {
    render(<Harness />);

    for (const input of [
      screen.getByLabelText("수량 *"),
      screen.getByLabelText("단가 (원) *"),
    ]) {
      expect(input).toHaveClass("text-base", "md:text-sm");
    }
  });

  it("keeps prominent inputs large at every breakpoint", () => {
    render(<Harness prominent />);

    const quantity = screen.getByLabelText("수량 *");
    expect(quantity).toHaveClass("text-2xl");
    expect(quantity.className).not.toMatch(/md:text-sm/);
  });
});
