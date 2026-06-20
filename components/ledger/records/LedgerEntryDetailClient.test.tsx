import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { useLedgerEntry } from "@/hooks/use-ledger-entries";
import { ApiQueryError } from "@/lib/api/client";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { LedgerEntryDetailClient } from "./LedgerEntryDetailClient";

vi.mock("next/navigation", () => ({
  usePathname: () => "/ledger/records/entry-1",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUserId: vi.fn(),
}));

vi.mock("@/hooks/use-ledger-entries", () => ({
  useLedgerEntry: vi.fn(),
}));

vi.mock("@/components/ledger/CategoryIcon", () => ({
  CategoryIcon: ({ iconName }: { iconName: string | null }) => (
    <span data-icon-name={iconName ?? "fallback"} />
  ),
}));

vi.mock("@/components/ledger/LedgerEntryEditDialog", () => ({
  LedgerEntryEditDialog: () => null,
}));

vi.mock("@/components/ledger/LedgerEntryDeleteDialog", () => ({
  LedgerEntryDeleteDialog: () => null,
}));

vi.mock("@/components/ledger/LedgerEntryChangeRequestDialog", () => ({
  LedgerEntryChangeRequestDialog: () => null,
}));

const mockEntry: LedgerEntryWithDetails = {
  id: "entry-1",
  householdId: "household-1",
  ownerId: "owner-1",
  ownerName: "홍길동",
  type: "expense",
  amount: 1250000, // Large amount to trigger disclosure
  title: "맛있는 소고기",
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
  memo: "외식 메모",
  transactedAt: "2026-06-16T00:00:00.000Z",
  createdAt: "2026-06-16T00:00:00.000Z",
  updatedAt: "2026-06-16T00:00:00.000Z",
};

describe("LedgerEntryDetailClient", () => {
  it("소유자 뷰: 헤더 타이틀, 타입 라벨, 금액 디스크로저, 배지, 인포 로우, 메모, 수정/삭제 버튼 렌더링", () => {
    vi.mocked(useCurrentUserId).mockReturnValue({
      userId: "owner-1",
      isLoading: false,
    });
    vi.mocked(useLedgerEntry).mockReturnValue({
      data: mockEntry,
      isLoading: false,
      error: null,
    } as any);

    render(<LedgerEntryDetailClient entryId="entry-1" />);

    // 1. 헤더 타이틀, 타입 라벨
    expect(screen.getAllByText("지출").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: "맛있는 소고기" }),
    ).toBeInTheDocument();

    // 2. 금액 디스크로저 (1,250,000 은 100만 이상이므로 compact 표시 +125만원이나 지출은 -125만원 혹은 format에 맞춰 표시)
    // 여기서는 type: expense 이므로 sign="-" 로 렌더링될 것. formatCompactCurrency에 의해 -125만원 표시.
    // trigger 버튼 accessible name 검증: "전체 금액 -1,250,000원"
    expect(
      screen.getByRole("button", { name: "전체 금액 -1,250,000원" }),
    ).toBeInTheDocument();

    // 3. 배지
    expect(screen.getAllByText("지출").length).toBeGreaterThan(0);
    expect(screen.getByText("공용")).toBeInTheDocument();

    // 4. 인포 로우
    expect(screen.getByText("카테고리")).toBeInTheDocument();
    expect(screen.getByText("식비")).toBeInTheDocument();
    expect(screen.getByText("돈 위치")).toBeInTheDocument();
    expect(screen.getByText("신용카드")).toBeInTheDocument();
    expect(screen.getByText("작성자")).toBeInTheDocument();
    expect(screen.getByText("홍길동")).toBeInTheDocument();

    // 5. 메모
    expect(screen.getByText("외식 메모")).toBeInTheDocument();

    // 6. 소유자용 수정/삭제 버튼
    expect(
      screen.getByRole("button", { name: "기록 수정" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "기록 삭제" }),
    ).toBeInTheDocument();
  });

  it("비소유자 뷰: 수정 요청/삭제 요청 버튼 렌더링", () => {
    vi.mocked(useCurrentUserId).mockReturnValue({
      userId: "non-owner",
      isLoading: false,
    });
    vi.mocked(useLedgerEntry).mockReturnValue({
      data: mockEntry,
      isLoading: false,
      error: null,
    } as any);

    render(<LedgerEntryDetailClient entryId="entry-1" />);

    // 비소유자는 수정 요청, 삭제 요청 버튼이 보여야 함
    expect(
      screen.getByRole("button", { name: "기록 수정 요청" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "기록 삭제 요청" }),
    ).toBeInTheDocument();
  });

  it("기록을 찾을 수 없거나 에러 상태일 때 missing state 렌더링", () => {
    vi.mocked(useCurrentUserId).mockReturnValue({
      userId: "owner-1",
      isLoading: false,
    });
    const apiError = new ApiQueryError("NOT_FOUND", "Not found", 404);
    vi.mocked(useLedgerEntry).mockReturnValue({
      data: null,
      isLoading: false,
      error: apiError,
    } as any);

    render(<LedgerEntryDetailClient entryId="entry-1" />);

    expect(screen.getByText("기록을 찾을 수 없습니다")).toBeInTheDocument();
  });

  it("소유자 뷰: 이체(transfer) 기록의 경우에도 소유자용 수정(태그 수정) 버튼이 렌더링된다", () => {
    const transferEntry: LedgerEntryWithDetails = {
      ...mockEntry,
      type: "transfer",
      amount: 50000,
      fromAccountId: "acc-1",
      fromAccountName: "통장A",
      toAccountId: "acc-2",
      toAccountName: "통장B",
      fromPaymentMethodId: null,
      fromPaymentMethodName: null,
    };

    vi.mocked(useCurrentUserId).mockReturnValue({
      userId: "owner-1",
      isLoading: false,
    });
    vi.mocked(useLedgerEntry).mockReturnValue({
      data: transferEntry,
      isLoading: false,
      error: null,
    } as any);

    render(<LedgerEntryDetailClient entryId="entry-1" />);

    expect(
      screen.getByRole("button", { name: "기록 수정" }),
    ).toBeInTheDocument();
  });

  it("비소유자 뷰: 이체(transfer) 기록의 경우 수정 요청 버튼이 렌더링되지 않는다", () => {
    const transferEntry: LedgerEntryWithDetails = {
      ...mockEntry,
      type: "transfer",
      amount: 50000,
      fromAccountId: "acc-1",
      fromAccountName: "통장A",
      toAccountId: "acc-2",
      toAccountName: "통장B",
      fromPaymentMethodId: null,
      fromPaymentMethodName: null,
    };

    vi.mocked(useCurrentUserId).mockReturnValue({
      userId: "non-owner",
      isLoading: false,
    });
    vi.mocked(useLedgerEntry).mockReturnValue({
      data: transferEntry,
      isLoading: false,
      error: null,
    } as any);

    render(<LedgerEntryDetailClient entryId="entry-1" />);

    expect(
      screen.queryByRole("button", { name: "기록 수정 요청" }),
    ).not.toBeInTheDocument();
  });
});
