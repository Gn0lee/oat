import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCurrentUserId } from "@/hooks/use-current-user";
import {
  useCancelRecordChangeRequest,
  useRecordChangeRequest,
  useResolveRecordChangeRequest,
} from "@/hooks/use-record-change-requests";
import { RecordChangeRequestDetailClient } from "./RecordChangeRequestDetailClient";

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUserId: vi.fn(),
}));

vi.mock("@/hooks/use-record-change-requests", () => ({
  useCancelRecordChangeRequest: vi.fn(),
  useRecordChangeRequest: vi.fn(),
  useResolveRecordChangeRequest: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockLedgerRequest = {
  id: "req-1",
  request_type: "update",
  status: "pending",
  target_id: "entry-1",
  target_type: "ledger_entry",
  target_owner_id: "owner-1",
  requester_id: "requester-1",
  proposed_changes: {
    amount: 1500000,
    title: "변경된 저녁식사",
  },
  target_snapshot: {
    targetType: "ledger_entry",
    amount: 1200000,
    title: "원래 저녁식사",
    transactedAt: "2026-06-16T00:00:00.000Z",
  },
  message: "금액 오타 수정합니다.",
  response_message: null,
};

const mockStockRequest = {
  id: "req-2",
  request_type: "update",
  status: "pending",
  target_id: "tx-1",
  target_type: "stock_transaction",
  target_owner_id: "owner-1",
  requester_id: "requester-1",
  proposed_changes: {
    quantity: 15,
  },
  target_snapshot: {
    targetType: "stock_transaction",
    type: "buy",
    ticker: "TSLA",
    quantity: 10,
    price: 200,
    transactedAt: "2026-06-16T00:00:00.000Z",
  },
  message: "수량 15주로 변경 요청",
  response_message: null,
};

describe("RecordChangeRequestDetailClient", () => {
  it("소유자 뷰: 승인/거절 버튼 및 요청 상세 렌더링", () => {
    vi.mocked(useCurrentUserId).mockReturnValue({
      userId: "owner-1",
      isLoading: false,
    });
    vi.mocked(useRecordChangeRequest).mockReturnValue({
      data: mockLedgerRequest,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useResolveRecordChangeRequest).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    render(<RecordChangeRequestDetailClient requestId="req-1" />);

    // 1. 헤더 타이틀, 스테이터스
    expect(screen.getByText("수정 요청")).toBeInTheDocument();
    expect(screen.getByText("대기 중")).toBeInTheDocument();

    // 2. 스냅샷 메타 로우
    expect(screen.getByText("요청 당시 금액")).toBeInTheDocument();
    expect(screen.getAllByText("1,200,000원").length).toBeGreaterThan(0);

    // 3. 변경 내용
    expect(screen.getByText("변경 내용")).toBeInTheDocument();
    expect(screen.getByText("금액")).toBeInTheDocument();
    expect(screen.getAllByText("1,200,000원").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1,500,000원").length).toBeGreaterThan(0);

    // 4. 메시지
    expect(screen.getByText("금액 오타 수정합니다.")).toBeInTheDocument();

    // 5. 소유자용 승인/거절 액션
    expect(
      screen.getByPlaceholderText("응답 메시지 (선택)"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "승인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "거절" })).toBeInTheDocument();
  });

  it("요청자 뷰: 취소 버튼 렌더링 및 승인/거절 버튼 미노출", () => {
    vi.mocked(useCurrentUserId).mockReturnValue({
      userId: "requester-1",
      isLoading: false,
    });
    vi.mocked(useRecordChangeRequest).mockReturnValue({
      data: mockLedgerRequest,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useCancelRecordChangeRequest).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    render(<RecordChangeRequestDetailClient requestId="req-1" />);

    expect(
      screen.getByRole("button", { name: "요청 취소" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "승인" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "거절" }),
    ).not.toBeInTheDocument();
  });

  it("주식 거래 요청: 수량, 단가, 거래일이 메타정보에 올바르게 노출된다", () => {
    vi.mocked(useCurrentUserId).mockReturnValue({
      userId: "owner-1",
      isLoading: false,
    });
    vi.mocked(useRecordChangeRequest).mockReturnValue({
      data: mockStockRequest,
      isLoading: false,
      error: null,
    } as any);

    render(<RecordChangeRequestDetailClient requestId="req-2" />);

    expect(screen.getByText("TSLA 거래")).toBeInTheDocument();
    expect(screen.getByText("거래 유형")).toBeInTheDocument();
    expect(screen.getByText("매수")).toBeInTheDocument();
    expect(screen.getAllByText("수량").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10주").length).toBeGreaterThan(0);
    expect(screen.getByText("단가")).toBeInTheDocument();
    expect(screen.getByText("200원")).toBeInTheDocument();
  });
});
