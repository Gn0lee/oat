import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import type { LedgerComposerValues } from "@/schemas/ledger-composer";
import { ComposerListStep } from "./ComposerListStep";

vi.mock("@/hooks/use-ledger-books", () => ({
  useLedgerBooks: () => ({
    data: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        name: "공용",
        visibility: "shared",
      },
    ],
  }),
}));
vi.mock("@/hooks/use-accounts", () => ({ useAccounts: () => ({ data: [] }) }));
vi.mock("@/hooks/use-payment-methods", () => ({
  usePaymentMethods: () => ({ data: [] }),
}));

const item = {
  clientId: "draft-1",
  type: "expense" as const,
  bookId: "00000000-0000-4000-8000-000000000001",
  amount: "12000",
  title: "점심",
  categoryId: "cat-1",
  transactedAt: "2026-06-23",
  memo: "",
};

function Wrapper({ children }: { children: React.ReactNode }) {
  const methods = useForm<LedgerComposerValues>({
    defaultValues: { items: [item] },
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

describe("ComposerListStep", () => {
  it("shows book-bound rows without tags and removes the selected item", () => {
    const onEditItem = vi.fn();
    render(
      <Wrapper>
        <ComposerListStep
          initialBookId={item.bookId}
          initialDate={item.transactedAt}
          onEditItem={onEditItem}
          onSubmit={vi.fn()}
          isSubmitting={false}
        />
      </Wrapper>,
    );
    expect(screen.getByText("점심")).toBeInTheDocument();
    expect(screen.getByText(/공용/)).toBeInTheDocument();
    expect(screen.queryByText(/#/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "1번째 기록 삭제" }));
    expect(screen.queryByText("점심")).not.toBeInTheDocument();
    expect(onEditItem).not.toHaveBeenCalled();
  });
});
