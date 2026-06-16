import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { LedgerDayEntryList } from "./LedgerDayEntryList";

vi.mock("@/components/ledger/CategoryIcon", () => ({
  CategoryIcon: ({ iconName }: { iconName: string | null }) => (
    <span data-icon-name={iconName ?? "fallback"} />
  ),
}));

const mockEntries: LedgerEntryWithDetails[] = [
  {
    id: "entry-1",
    householdId: "household-1",
    ownerId: "owner-1",
    ownerName: "홍길동",
    type: "expense",
    amount: 10000,
    title: "커피",
    categoryId: "cat-1",
    categoryName: "식비",
    categoryIcon: "Coffee",
    fromAccountId: null,
    fromAccountName: null,
    fromPaymentMethodId: "pay-1",
    fromPaymentMethodName: "신용카드",
    toAccountId: null,
    toAccountName: null,
    toPaymentMethodId: null,
    toPaymentMethodName: null,
    isShared: true,
    memo: "스타벅스",
    transactedAt: "2026-06-16T00:00:00.000Z",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  },
  {
    id: "entry-2",
    householdId: "household-1",
    ownerId: "owner-1",
    ownerName: "홍길동",
    type: "income",
    amount: 50000,
    title: "용돈",
    categoryId: "cat-2",
    categoryName: "기타",
    categoryIcon: "Gift",
    fromAccountId: null,
    fromAccountName: null,
    fromPaymentMethodId: null,
    fromPaymentMethodName: null,
    toAccountId: null,
    toAccountName: null,
    toPaymentMethodId: "pay-2",
    toPaymentMethodName: "계좌",
    isShared: true,
    memo: "부모님",
    transactedAt: "2026-06-16T00:00:00.000Z",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  },
];

describe("LedgerDayEntryList", () => {
  it("선택된 날짜 헤더, 건수 배지, 그룹 리스트 및 링크들을 렌더링한다", () => {
    const selectedDate = new Date("2026-06-16T00:00:00Z");
    render(
      <LedgerDayEntryList selectedDate={selectedDate} entries={mockEntries} />,
    );

    // 1. 날짜 헤더 검증
    expect(
      screen.getByRole("heading", { name: "6월 16일 (화)" }),
    ).toBeInTheDocument();

    // 2. 건수 배지 검증 (2건)
    expect(screen.getByText("2건")).toBeInTheDocument();

    // 3. 개별 행 및 링크 확인
    expect(screen.getByRole("link", { name: /커피/ })).toHaveAttribute(
      "href",
      "/ledger/records/entry-1?from=records&date=2026-06-16",
    );
    expect(screen.getByRole("link", { name: /용돈/ })).toHaveAttribute(
      "href",
      "/ledger/records/entry-2?from=records&date=2026-06-16",
    );
  });

  it("기록이 없을 때 공통 empty state를 사용해 빈 상태를 보여준다", () => {
    const selectedDate = new Date("2026-06-16T00:00:00Z");
    render(<LedgerDayEntryList selectedDate={selectedDate} entries={[]} />);

    expect(screen.getByTestId("screen-state")).toBeInTheDocument();
    expect(screen.getByText("이 날의 기록이 없습니다.")).toBeInTheDocument();
  });
});
