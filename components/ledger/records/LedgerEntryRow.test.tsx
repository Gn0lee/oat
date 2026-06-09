import { render, screen } from "@testing-library/react";
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

function renderRow(entry: LedgerEntryWithDetails) {
  return render(
    <LedgerEntryRow
      entry={entry}
      href={`/ledger/records/${entry.id}?from=records&date=2026-06-02`}
    />,
  );
}

describe("LedgerEntryRow", () => {
  it("기록 상세로 이동하는 링크를 렌더링한다", () => {
    renderRow(baseEntry);

    expect(screen.getByRole("link", { name: /점심/ })).toHaveAttribute(
      "href",
      "/ledger/records/entry-1?from=records&date=2026-06-02",
    );
    expect(screen.queryByRole("button", { name: "기록 작업" })).toBeNull();
  });

  it("이체 기록에는 카테고리 기본 아이콘 대신 이체 아이콘을 보여준다", () => {
    renderRow({
      ...baseEntry,
      type: "transfer",
      categoryId: null,
      categoryName: null,
      categoryIcon: null,
    });

    expect(screen.getByTestId("ledger-entry-icon")).toHaveAttribute(
      "data-icon-name",
      "ArrowLeftRight",
    );
  });
});
