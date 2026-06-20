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
    expect(screen.getByText("식비")).toBeInTheDocument();
    expect(screen.getByText("소유자")).toBeInTheDocument();
    expect(screen.getByText("현대카드")).toBeInTheDocument();
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

  it("긴 타이틀과 큰 금액을 정책에 맞게 올바르게 렌더링한다", () => {
    const longExpenseEntry: LedgerEntryWithDetails = {
      ...baseEntry,
      amount: 1250000,
      title: "아주아주아주아주아주긴가계부제목",
      type: "expense",
    };
    const { rerender } = renderRow(longExpenseEntry);

    const titleElement = screen.getByText("아주아주아주아주아주긴가계부제목");
    expect(titleElement).toHaveClass("line-clamp-2");
    expect(
      titleElement.parentElement?.querySelector(".flex-wrap"),
    ).not.toBeNull();

    const expenseAmount = screen.getByText("-1,250,000원");
    expect(expenseAmount).toBeInTheDocument();
    expect(expenseAmount).toHaveClass("[overflow-wrap:anywhere]");
    expect(expenseAmount).toHaveClass("whitespace-nowrap");
    expect(expenseAmount).toHaveAttribute("title", "-1,250,000원");
    expect(expenseAmount.textContent).not.toContain("만원");
    expect(expenseAmount.parentElement).toHaveClass("max-w-[42%]");

    // Add check for -42,000원
    const midExpenseEntry: LedgerEntryWithDetails = {
      ...baseEntry,
      amount: 42000,
      type: "expense",
    };
    rerender(
      <LedgerEntryRow
        entry={midExpenseEntry}
        href={`/ledger/records/${midExpenseEntry.id}?from=records&date=2026-06-02`}
      />,
    );
    const midExpenseAmount = screen.getByText("-42,000원");
    expect(midExpenseAmount).toBeInTheDocument();

    const incomeEntry: LedgerEntryWithDetails = {
      ...baseEntry,
      amount: 1250000,
      type: "income",
    };
    rerender(
      <LedgerEntryRow
        entry={incomeEntry}
        href={`/ledger/records/${incomeEntry.id}?from=records&date=2026-06-02`}
      />,
    );
    const incomeAmount = screen.getByText("+1,250,000원");
    expect(incomeAmount).toBeInTheDocument();
    expect(incomeAmount).toHaveAttribute("title", "+1,250,000원");

    const transferEntry: LedgerEntryWithDetails = {
      ...baseEntry,
      amount: 1250000,
      type: "transfer",
    };
    rerender(
      <LedgerEntryRow
        entry={transferEntry}
        href={`/ledger/records/${transferEntry.id}?from=records&date=2026-06-02`}
      />,
    );
    const transferAmount = screen.getByText("1,250,000원");
    expect(transferAmount).toBeInTheDocument();
    expect(transferAmount).toHaveAttribute("title", "1,250,000원");
  });

  it("태그가 있으면 #형식으로 화면에 보여준다 (최대 3개)", () => {
    renderRow({
      ...baseEntry,
      tags: [
        { id: "1", name: "여행" },
        { id: "2", name: "데이트" },
      ],
    });

    expect(screen.getByText("#여행")).toBeInTheDocument();
    expect(screen.getByText("#데이트")).toBeInTheDocument();
  });

  it("태그가 3개를 초과하면 3개까지만 보여주고 +N을 표시한다", () => {
    renderRow({
      ...baseEntry,
      tags: [
        { id: "1", name: "태그1" },
        { id: "2", name: "태그2" },
        { id: "3", name: "태그3" },
        { id: "4", name: "태그4" },
        { id: "5", name: "태그5" },
      ],
    });

    expect(screen.getByText("#태그1")).toBeInTheDocument();
    expect(screen.getByText("#태그2")).toBeInTheDocument();
    expect(screen.getByText("#태그3")).toBeInTheDocument();
    expect(screen.queryByText("#태그4")).toBeNull();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });
});
