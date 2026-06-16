import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  useAccountBalanceDetail,
  useCreateBalanceAdjustment,
  usePaymentMethodBalanceDetail,
} from "@/hooks/use-balance-detail";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { BalanceDetailClient } from "./BalanceDetailClient";

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUserId: vi.fn(),
}));

vi.mock("@/hooks/use-balance-detail", () => ({
  useAccountBalanceDetail: vi.fn(),
  usePaymentMethodBalanceDetail: vi.fn(),
  useCreateBalanceAdjustment: vi.fn(),
}));

vi.mock("./AccountFormDialog", () => ({
  AccountFormDialog: () => null,
}));

vi.mock("./AccountDeleteDialog", () => ({
  AccountDeleteDialog: () => null,
}));

vi.mock("./PaymentMethodFormDialog", () => ({
  PaymentMethodFormDialog: () => null,
}));

vi.mock("./PaymentMethodDeleteDialog", () => ({
  PaymentMethodDeleteDialog: () => null,
}));

// Dialog component mocks to prevent Radix UI portal issues in test environment
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

// Mock window.matchMedia for JSDOM
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const mockAccountInvestmentDetail = {
  account: {
    id: "account-1",
    name: "미래에셋증권 ISA",
    ownerId: "owner-1",
    ownerName: "홍길동",
    broker: "미래에셋",
    accountType: "isa",
    balance: 1500000, // 예수금 (150만원 -> compact)
    category: "investment",
  },
  totalValue: 5000000, // 계좌 총액 (500만원 -> compact)
  stockValue: 3500000, // 보유 주식 평가액 (350만원 -> compact)
  timeline: [
    {
      kind: "adjustment",
      id: "adj-1",
      title: "잔액 맞추기",
      label: "조정",
      occurredAt: "2026-06-16T00:00:00.000Z",
      delta: 500000,
    },
  ],
};

const mockPaymentMethodDetail = {
  paymentMethod: {
    id: "pay-1",
    name: "네이버페이 머니",
    ownerId: "owner-1",
    ownerName: "홍길동",
    type: "prepaid",
    balance: 50000, // 5만원 (non-compact)
  },
  timeline: [],
};

describe("BalanceDetailClient", () => {
  it("투자 계좌 뷰: 예수금 및 보유 주식 평가액, 계좌 총액 메트릭들과 타임라인 렌더링", () => {
    vi.mocked(useCurrentUserId).mockReturnValue({
      userId: "owner-1",
      isLoading: false,
    });
    vi.mocked(useAccountBalanceDetail).mockReturnValue({
      data: mockAccountInvestmentDetail,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useCreateBalanceAdjustment).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    render(<BalanceDetailClient kind="account" id="account-1" />);

    // 1. 타이틀 / 서브타이틀
    expect(screen.getByText("미래에셋증권 ISA")).toBeInTheDocument();
    expect(screen.getByText("홍길동 · 미래에셋 · ISA")).toBeInTheDocument();

    // 2. 메트릭스 라벨 및 금액 디스크로저
    expect(screen.getByText("예수금")).toBeInTheDocument();
    expect(screen.getAllByText("1,500,000원")[0]).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "전체 금액 1,500,000원" }),
    ).not.toBeInTheDocument();

    expect(screen.getByText("보유 주식 평가액")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "전체 금액 3,500,000원" }),
    ).toBeInTheDocument();

    expect(screen.getByText("계좌 총액")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "전체 금액 5,000,000원" }),
    ).toBeInTheDocument();

    // 3. 조정 버튼 (소유자)
    expect(
      screen.getByRole("button", { name: "예수금 맞추기" }),
    ).toBeInTheDocument();

    // 4. 타임라인 로우
    expect(screen.getByText("잔액 변화 내역")).toBeInTheDocument();
    expect(screen.getByText("잔액 맞추기")).toBeInTheDocument();
    expect(screen.getByText("+500,000원")).toBeInTheDocument();
  });

  it("결제수단 뷰: 보조잔액 정책 및 조정 버튼 렌더링", () => {
    vi.mocked(useCurrentUserId).mockReturnValue({
      userId: "owner-1",
      isLoading: false,
    });
    vi.mocked(usePaymentMethodBalanceDetail).mockReturnValue({
      data: mockPaymentMethodDetail,
      isLoading: false,
      error: null,
    } as any);

    render(<BalanceDetailClient kind="payment_method" id="pay-1" />);

    expect(screen.getByText("네이버페이 머니")).toBeInTheDocument();
    expect(screen.getByText("홍길동 · 선불페이")).toBeInTheDocument();
    expect(screen.getByText("보조잔액")).toBeInTheDocument();
    expect(screen.getAllByText("50,000원").length).toBeGreaterThan(0);

    // 50,000원은 compact가 아니므로 button이 아니어야 함
    expect(
      screen.queryByRole("button", { name: "전체 금액 50,000원" }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "실제 잔액 맞추기" }),
    ).toBeInTheDocument();
  });

  it("불러오기 에러가 발생했을 때 공통 ScreenState type=error를 보여준다", () => {
    vi.mocked(useCurrentUserId).mockReturnValue({
      userId: "owner-1",
      isLoading: false,
    });
    vi.mocked(useAccountBalanceDetail).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Server Error"),
    } as any);

    render(<BalanceDetailClient kind="account" id="account-1" />);

    expect(screen.getByTestId("screen-state")).toBeInTheDocument();
    expect(
      screen.getByText("상세 정보를 불러오지 못했습니다."),
    ).toBeInTheDocument();
  });

  it("소유자일 때 계좌 상세에서 수정 및 삭제 버튼이 렌더링된다", () => {
    vi.mocked(useCurrentUserId).mockReturnValue({
      userId: "owner-1",
      isLoading: false,
    });
    vi.mocked(useAccountBalanceDetail).mockReturnValue({
      data: mockAccountInvestmentDetail,
      isLoading: false,
      error: null,
    } as any);

    render(<BalanceDetailClient kind="account" id="account-1" />);

    expect(screen.getByRole("button", { name: "수정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
  });

  it("소유자가 아닐 때 계좌 상세에서 수정 및 삭제 버튼이 렌더링되지 않는다", () => {
    vi.mocked(useCurrentUserId).mockReturnValue({
      userId: "other-user",
      isLoading: false,
    });
    vi.mocked(useAccountBalanceDetail).mockReturnValue({
      data: mockAccountInvestmentDetail,
      isLoading: false,
      error: null,
    } as any);

    render(<BalanceDetailClient kind="account" id="account-1" />);

    expect(
      screen.queryByRole("button", { name: "수정" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "삭제" }),
    ).not.toBeInTheDocument();
  });
});
