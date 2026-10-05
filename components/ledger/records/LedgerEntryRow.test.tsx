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
  bookId: "book-1",
  book: { name: "여행비", visibility: "shared", archivedAt: null },
};

const href = "/ledger/records/entry-1?from=records&date=2026-06-02";

describe("LedgerEntryRow", () => {
  it("금액을 크게, 제목과 결제수단을 한 줄로 보여주고 상세로 연결한다", () => {
    render(<LedgerEntryRow entry={baseEntry} href={href} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", href);
    expect(link).toHaveAccessibleName(/점심/);
    expect(link).toHaveAccessibleName(/-12,000원/);
    expect(screen.getByText("-12,000원")).toHaveClass("text-base");
    expect(screen.getByText("점심 | 현대카드")).toBeInTheDocument();
    expect(screen.getByTestId("ledger-entry-icon")).toHaveAttribute(
      "data-icon-name",
      "Utensils",
    );
  });

  it("보조 줄에 카테고리와 다른 작성자를 보여주고 내 기록이면 작성자를 생략한다", () => {
    const { rerender } = render(
      <LedgerEntryRow entry={baseEntry} href={href} currentUserId="me" />,
    );
    expect(screen.getByText("식비 · 소유자")).toBeInTheDocument();

    rerender(
      <LedgerEntryRow entry={baseEntry} href={href} currentUserId="owner-1" />,
    );
    expect(screen.getByText("식비")).toBeInTheDocument();
    expect(screen.queryByText(/소유자/)).toBeNull();
  });

  it("전체 범위에서는 장부 이름, 개인·보관 상태를 텍스트로 표시한다", () => {
    render(
      <LedgerEntryRow
        entry={{
          ...baseEntry,
          isShared: false,
          book: {
            name: "내 용돈",
            visibility: "personal",
            archivedAt: "2026-10-01T00:00:00Z",
          },
        }}
        href={href}
        currentUserId="owner-1"
        showBook
      />,
    );
    expect(
      screen.getByText("식비 · 내 용돈 · 개인 · 보관"),
    ).toBeInTheDocument();
  });

  it("특정 장부 범위에서는 장부 이름을 반복하지 않지만 개인 표시는 남긴다", () => {
    render(
      <LedgerEntryRow
        entry={{
          ...baseEntry,
          isShared: false,
          book: { name: "내 용돈", visibility: "personal", archivedAt: null },
        }}
        href={href}
        currentUserId="owner-1"
      />,
    );
    expect(screen.getByText("식비 · 개인")).toBeInTheDocument();
  });

  it("수입은 +, 내부이체는 부호 없이 출발→도착을 보여준다", () => {
    const { rerender } = render(
      <LedgerEntryRow
        entry={{ ...baseEntry, type: "income", amount: 1250000 }}
        href={href}
      />,
    );
    expect(screen.getByText("+1,250,000원")).toHaveClass("text-red-500");

    rerender(
      <LedgerEntryRow
        entry={{
          ...baseEntry,
          type: "transfer",
          amount: 1250000,
          title: null,
          categoryName: null,
          fromPaymentMethodName: null,
          fromAccountName: "생활비 통장",
          toAccountName: "적금",
        }}
        href={href}
      />,
    );
    expect(screen.getByText("1,250,000원")).toBeInTheDocument();
    expect(
      screen.getByText("내부이체 | 생활비 통장 → 적금"),
    ).toBeInTheDocument();
  });

  it("검색 결과에서는 거래일과 일치한 메모를 함께 보여준다", () => {
    render(
      <LedgerEntryRow
        entry={baseEntry}
        href={href}
        dateLabel="2026.06.02"
        memoContext="메모: 김밥"
      />,
    );
    expect(screen.getByText("식비 · 소유자 · 2026.06.02")).toBeInTheDocument();
    expect(screen.getByText("메모: 김밥")).toHaveClass("line-clamp-1");
  });

  it("목록 행에는 태그를 표시하지 않는다", () => {
    render(
      <LedgerEntryRow
        entry={{ ...baseEntry, tags: [{ id: "t1", name: "여행" }] }}
        href={href}
      />,
    );
    expect(screen.queryByText("#여행")).toBeNull();
  });
});
