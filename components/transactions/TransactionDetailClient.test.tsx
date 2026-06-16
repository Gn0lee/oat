import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { useTransaction } from "@/hooks/use-transaction";
import { ApiQueryError } from "@/lib/api/client";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { TransactionDetailClient } from "./TransactionDetailClient";

vi.mock("next/navigation", () => ({
  usePathname: () => "/assets/stock/transactions/tx-1",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUserId: vi.fn(),
}));

vi.mock("@/hooks/use-transaction", () => ({
  useTransaction: vi.fn(),
}));

vi.mock("@/components/transactions/TransactionEditDialog", () => ({
  TransactionEditDialog: () => null,
}));

vi.mock("@/components/transactions/TransactionDeleteDialog", () => ({
  TransactionDeleteDialog: () => null,
}));

vi.mock("@/components/transactions/TransactionChangeRequestDialog", () => ({
  TransactionChangeRequestDialog: () => null,
}));

const mockTransaction: TransactionWithDetails = {
  id: "tx-1",
  ticker: "AAPL",
  stockName: "Apple Inc.",
  type: "buy",
  quantity: 10,
  price: 150,
  totalAmount: 1500,
  currency: "USD",
  transactedAt: "2026-06-16T00:00:00.000Z",
  memo: "아이폰 출시 기념 매수",
  accountId: "account-1",
  accountName: "토스증권",
  owner: { id: "owner-1", name: "홍길동" },
};

const mockLargeTransaction: TransactionWithDetails = {
  ...mockTransaction,
  id: "tx-large",
  quantity: 10,
  price: 125000,
  totalAmount: 1250000,
  currency: "KRW",
};

describe("TransactionDetailClient", () => {
  it("소유자 뷰: 주식명, 티커, 타입/통화 배지, 금액 디스크로저, 메타 인포, 메모, 수정/삭제 버튼 렌더링", () => {
    vi.mocked(useCurrentUserId).mockReturnValue({
      userId: "owner-1",
      isLoading: false,
    });
    vi.mocked(useTransaction).mockReturnValue({
      data: mockLargeTransaction,
      isLoading: false,
      error: null,
    } as any);

    render(<TransactionDetailClient transactionId="tx-large" />);

    // 1. 주식명, 티커
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Apple Inc." }),
    ).toBeInTheDocument();

    // 2. 금액 디스크로저 (125만원, type: buy 이므로 neutral 톤과 format에 맞는 sign)
    // formatCompactCurrency에 의해 125만원 표시.
    // trigger 버튼 accessible name 검증: "전체 금액 1,250,000원"
    expect(
      screen.getByRole("button", { name: "전체 금액 1,250,000원" }),
    ).toBeInTheDocument();

    // 3. 배지
    expect(screen.getAllByText("매수").length).toBeGreaterThan(0);
    expect(screen.getByText("KRW")).toBeInTheDocument();

    // 4. 인포 로우
    expect(screen.getByText("수량")).toBeInTheDocument();
    expect(screen.getByText("10주")).toBeInTheDocument();
    expect(screen.getByText("단가")).toBeInTheDocument();
    expect(screen.getByText("125,000원")).toBeInTheDocument();
    expect(screen.getByText("투자 계좌")).toBeInTheDocument();
    expect(screen.getByText("토스증권")).toBeInTheDocument();
    expect(screen.getByText("작성자")).toBeInTheDocument();
    expect(screen.getByText("홍길동")).toBeInTheDocument();

    // 5. 메모
    expect(screen.getByText("아이폰 출시 기념 매수")).toBeInTheDocument();

    // 6. 소유자용 수정/삭제 버튼
    expect(
      screen.getByRole("button", { name: "거래 수정" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "거래 삭제" }),
    ).toBeInTheDocument();
  });

  it("비소유자 뷰: 수정 요청/삭제 요청 버튼 렌더링", () => {
    vi.mocked(useCurrentUserId).mockReturnValue({
      userId: "non-owner",
      isLoading: false,
    });
    vi.mocked(useTransaction).mockReturnValue({
      data: mockTransaction,
      isLoading: false,
      error: null,
    } as any);

    render(<TransactionDetailClient transactionId="tx-1" />);

    expect(
      screen.getByRole("button", { name: "거래 수정 요청" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "거래 삭제 요청" }),
    ).toBeInTheDocument();
  });

  it("거래를 찾을 수 없거나 에러 상태일 때 missing state 렌더링", () => {
    vi.mocked(useCurrentUserId).mockReturnValue({
      userId: "owner-1",
      isLoading: false,
    });
    const apiError = new ApiQueryError("NOT_FOUND", "Not found", 404);
    vi.mocked(useTransaction).mockReturnValue({
      data: null,
      isLoading: false,
      error: apiError,
    } as any);

    render(<TransactionDetailClient transactionId="tx-1" />);

    expect(screen.getByText("거래를 찾을 수 없습니다")).toBeInTheDocument();
  });
});
