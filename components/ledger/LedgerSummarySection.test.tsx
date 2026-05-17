import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useLedgerEntrySummary } from "@/hooks/use-ledger-entries";
import { ApiQueryError } from "@/lib/api/client";
import { LedgerSummarySection } from "./LedgerSummarySection";

vi.mock("@/hooks/use-ledger-entries", () => ({
  useLedgerEntrySummary: vi.fn(),
}));

describe("LedgerSummarySection", () => {
  it("월 현금 흐름을 불러오는 동안 스켈레톤을 표시한다", () => {
    vi.mocked(useLedgerEntrySummary).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useLedgerEntrySummary>);

    const { container } = render(
      <LedgerSummarySection year={2026} month={5} />,
    );

    expect(screen.getByText("5월 현금 흐름")).toBeInTheDocument();
    expect(
      container.querySelectorAll("[data-slot='skeleton']").length,
    ).toBeGreaterThan(0);
  });

  it("가구가 없으면 설정 전 상태로 표시한다", () => {
    vi.mocked(useLedgerEntrySummary).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new ApiQueryError(
        "HOUSEHOLD_NOT_FOUND",
        "가구 정보를 찾을 수 없습니다.",
        404,
      ),
    } as ReturnType<typeof useLedgerEntrySummary>);

    render(<LedgerSummarySection year={2026} month={5} />);

    expect(
      screen.getByText("가구 정보를 불러올 수 없어요"),
    ).toBeInTheDocument();
  });

  it("월 수입, 지출, 잔액을 렌더링한다", () => {
    vi.mocked(useLedgerEntrySummary).mockReturnValue({
      data: {
        totalIncome: 3_000_000,
        totalExpense: 1_200_000,
        balance: 1_800_000,
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useLedgerEntrySummary>);

    render(<LedgerSummarySection year={2026} month={5} />);

    expect(screen.getByText("₩1,800,000")).toBeInTheDocument();
    expect(screen.getByText("₩3,000,000")).toBeInTheDocument();
    expect(screen.getByText("₩1,200,000")).toBeInTheDocument();
  });
});
