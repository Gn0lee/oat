import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import type { LedgerComposerValues } from "@/schemas/ledger-composer";
import { EntryReviewStep } from "./EntryReviewStep";

vi.mock("@/hooks/use-ledger-books", () => ({
  useLedgerBooks: () => ({
    data: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "여행",
        visibility: "shared",
      },
    ],
  }),
}));
vi.mock("@/hooks/use-categories", () => ({
  useCategories: (type: string) => ({
    data:
      type === "income"
        ? [{ id: "income", name: "급여", parent_id: null }]
        : [
            { id: "food", name: "검증식비", parent_id: null },
            { id: "cafe", name: "검증카페", parent_id: "food" },
          ],
  }),
}));
vi.mock("@/hooks/use-accounts", () => ({
  useAccounts: () => ({
    data: [
      {
        id: "account-1",
        name: "주거래 통장",
        ownerId: "user-1",
        ownerName: "검증자",
        broker: null,
        lastFour: null,
        accountType: "checking",
        category: "bank",
        isHouseholdUsable: true,
      },
    ],
  }),
}));
vi.mock("@/hooks/use-payment-methods", () => ({
  usePaymentMethods: () => ({
    data: [
      {
        id: "pm-1",
        name: "현금",
        ownerId: "user-1",
        ownerName: "검증자",
        type: "cash",
        issuer: null,
        lastFour: null,
        isHouseholdUsable: true,
      },
    ],
  }),
}));
vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUserId: () => ({ userId: "user-1", isLoading: false }),
}));

const values: LedgerComposerValues = {
  items: [
    {
      clientId: "expense-1",
      type: "expense",
      bookId: "11111111-1111-4111-8111-111111111111",
      title: "카페",
      amount: "5000",
      categoryId: "cafe",
      accountId: "account-1",
      transactedAt: "2026-10-06",
      memo: "첫째 메모 유지",
    },
    {
      clientId: "expense-2",
      type: "expense",
      bookId: "11111111-1111-4111-8111-111111111111",
      title: "점심",
      amount: "9000",
      categoryId: "food",
      paymentMethodId: "pm-1",
      transactedAt: "2026-10-06",
      memo: "둘째 메모 유지",
    },
    {
      clientId: "transfer-1",
      type: "transfer",
      bookId: "11111111-1111-4111-8111-111111111111",
      title: "이동",
      amount: "10000",
      fromValue: "pm:pm-1",
      toValue: "acc:account-1",
      transactedAt: "2026-10-06",
      memo: "",
    },
  ],
};

function Wrapper({ children }: { children: React.ReactNode }) {
  const form = useForm<LedgerComposerValues>({ defaultValues: values });
  return <FormProvider {...form}>{children}</FormProvider>;
}

describe("EntryReviewStep", () => {
  it("shows actual category, source and transfer values and retains independent expanded memos", () => {
    const onEdit = vi.fn();
    render(
      <Wrapper>
        <EntryReviewStep
          onEdit={onEdit}
          onAdd={vi.fn()}
          onSave={vi.fn()}
          isSaving={false}
        />
      </Wrapper>,
    );
    expect(
      screen.getByRole("button", {
        name: "기록 1 분류 수정: 검증식비 > 검증카페",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "기록 1 금융수단 수정: 주거래 통장 · 검증자",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "기록 3 금융수단 수정: 현금 · 검증자 → 주거래 통장 · 검증자",
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "기록 2 내용 수정: 점심" }),
    );
    expect(onEdit).toHaveBeenCalledWith(
      "expense-2",
      "basics",
      "review-expense-2-title",
    );

    fireEvent.click(screen.getByRole("button", { name: "메모 1 편집" }));
    fireEvent.click(screen.getByRole("button", { name: "메모 2 편집" }));
    const firstMemo = screen.getByRole("textbox", { name: "메모 1" });
    fireEvent.change(firstMemo, { target: { value: "첫째 메모 수정" } });
    fireEvent.click(screen.getByRole("button", { name: "메모 1 접기" }));
    expect(screen.getByText("첫째 메모 수정")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "메모 2" })).toHaveValue(
      "둘째 메모 유지",
    );
    expect(screen.getByRole("button", { name: "메모 2 접기" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});
