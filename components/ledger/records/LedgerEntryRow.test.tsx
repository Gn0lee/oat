import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { LedgerEntryRow } from "./LedgerEntryRow";

vi.mock("@/components/ledger/CategoryIcon", () => ({
  CategoryIcon: ({
    iconName,
    className,
  }: {
    iconName: string | null;
    className?: string;
  }) => (
    <span
      className={className}
      data-icon-name={iconName ?? "fallback"}
      data-testid="ledger-entry-icon"
    />
  ),
}));

const baseEntry: LedgerEntryWithDetails = {
  id: "entry-1",
  householdId: "household-1",
  ownerId: "owner-1",
  ownerName: "소유자",
  type: "expense",
  amount: 12000,
  title: "점심",
  categoryId: "category-1",
  categoryName: "식비",
  categoryIcon: "Utensils",
  fromAccountId: null,
  fromAccountName: null,
  fromPaymentMethodId: "payment-1",
  fromPaymentMethodName: "현대카드",
  toAccountId: null,
  toAccountName: null,
  toPaymentMethodId: null,
  toPaymentMethodName: null,
  isShared: true,
  memo: "김밥",
  transactedAt: "2026-06-02T00:00:00.000Z",
  createdAt: "2026-06-02T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
};

function renderRow(entry: LedgerEntryWithDetails, currentUserId: string) {
  return render(
    <LedgerEntryRow
      entry={entry}
      currentUserId={currentUserId}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      onRequestUpdate={vi.fn()}
      onRequestDelete={vi.fn()}
    />,
  );
}

describe("LedgerEntryRow", () => {
  it("소유자 지출 기록에는 직접 수정과 삭제 액션을 보여준다", async () => {
    renderRow(baseEntry, "owner-1");

    await userEvent.click(screen.getByRole("button", { name: "기록 작업" }));

    expect(screen.getByText("수정")).toBeInTheDocument();
    expect(screen.getByText("삭제")).toBeInTheDocument();
    expect(screen.queryByText("수정 요청")).not.toBeInTheDocument();
  });

  it("소유자 이체 기록에는 삭제 액션만 보여준다", async () => {
    renderRow({ ...baseEntry, type: "transfer" }, "owner-1");

    await userEvent.click(screen.getByRole("button", { name: "기록 작업" }));

    expect(screen.queryByText("수정")).not.toBeInTheDocument();
    expect(screen.getByText("삭제")).toBeInTheDocument();
  });

  it("비소유자 공용 지출 기록에는 수정 요청과 삭제 요청을 보여준다", async () => {
    renderRow(baseEntry, "requester-1");

    await userEvent.click(screen.getByRole("button", { name: "기록 작업" }));

    expect(screen.getByText("수정 요청")).toBeInTheDocument();
    expect(screen.getByText("삭제 요청")).toBeInTheDocument();
    expect(screen.queryByText("수정")).not.toBeInTheDocument();
  });

  it("비소유자 공용 이체 기록에는 삭제 요청만 보여준다", async () => {
    renderRow({ ...baseEntry, type: "transfer" }, "requester-1");

    await userEvent.click(screen.getByRole("button", { name: "기록 작업" }));

    expect(screen.queryByText("수정 요청")).not.toBeInTheDocument();
    expect(screen.getByText("삭제 요청")).toBeInTheDocument();
  });

  it("이체 기록에는 카테고리 기본 아이콘 대신 이체 아이콘을 보여준다", () => {
    renderRow(
      {
        ...baseEntry,
        type: "transfer",
        categoryId: null,
        categoryName: null,
        categoryIcon: null,
      },
      "owner-1",
    );

    expect(screen.getByTestId("ledger-entry-icon")).toHaveAttribute(
      "data-icon-name",
      "ArrowLeftRight",
    );
  });
});
