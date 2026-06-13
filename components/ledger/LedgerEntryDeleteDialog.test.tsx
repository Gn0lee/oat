import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { LedgerEntryDeleteDialog } from "./LedgerEntryDeleteDialog";

vi.mock("@/hooks/use-ledger-entries", () => ({
  useDeleteLedgerEntry: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

const nonExpenseWithdrawalEntry: LedgerEntryWithDetails = {
  id: "entry-2",
  householdId: "household-1",
  ownerId: "owner-1",
  ownerName: "소유자",
  type: "non_expense_withdrawal",
  amount: 50000,
  title: "카드대금",
  categoryId: null,
  categoryName: null,
  categoryIcon: null,
  fromAccountId: "account-1",
  fromAccountName: "토스뱅크",
  fromPaymentMethodId: null,
  fromPaymentMethodName: null,
  toAccountId: null,
  toAccountName: null,
  toPaymentMethodId: null,
  toPaymentMethodName: null,
  isShared: true,
  memo: "카드대금 정산",
  transactedAt: "2026-06-02T00:00:00.000Z",
  createdAt: "2026-06-02T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
};

describe("LedgerEntryDeleteDialog", () => {
  it("비지출 출금 기록 삭제 시 비지출 출금 및 출금처 라벨을 정상적으로 표시한다", () => {
    render(
      <LedgerEntryDeleteDialog
        entry={nonExpenseWithdrawalEntry}
        open={true}
        onOpenChange={() => {}}
      />,
    );

    expect(screen.getByText("비지출 출금")).toBeInTheDocument();
    expect(screen.getByText("출금처")).toBeInTheDocument();
    expect(screen.getByText("토스뱅크")).toBeInTheDocument();
  });
});
