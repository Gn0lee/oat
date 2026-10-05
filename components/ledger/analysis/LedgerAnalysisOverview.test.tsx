import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  useLedgerStatsByCategory,
  useLedgerStatsSummary,
} from "@/hooks/use-ledger-stats";
import { ApiQueryError } from "@/lib/api/client";
import { LedgerAnalysisOverview } from "./LedgerAnalysisOverview";

vi.mock("@/hooks/use-ledger-stats", () => ({
  useLedgerStatsSummary: vi.fn(),
  useLedgerStatsByCategory: vi.fn(),
}));

const BOOK = "00000000-0000-4000-8000-000000000001";
const summary = {
  year: 2026,
  month: 5,
  bookId: null,
  total: {
    totalIncome: 4_500_000,
    totalExpense: 1_800_000,
    balance: 2_700_000,
    savingsRate: 60,
  },
  shared: {
    totalIncome: 4_000_000,
    totalExpense: 1_500_000,
    balance: 2_500_000,
    savingsRate: 62.5,
  },
  personal: {
    totalIncome: 500_000,
    totalExpense: 300_000,
    balance: 200_000,
    savingsRate: 40,
  },
};

describe("LedgerAnalysisOverview", () => {
  it("요약과 카테고리 프리뷰를 불러오는 동안 스켈레톤을 표시한다", () => {
    vi.mocked(useLedgerStatsSummary).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useLedgerStatsSummary>);
    vi.mocked(useLedgerStatsByCategory).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useLedgerStatsByCategory>);

    const { container } = render(
      <LedgerAnalysisOverview year={2026} month={5} />,
    );

    expect(
      container.querySelectorAll("[data-slot='skeleton']").length,
    ).toBeGreaterThan(0);
  });

  it("shows the all-books total with shared and my personal subtotals", () => {
    vi.mocked(useLedgerStatsSummary).mockReturnValue({
      data: summary,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useLedgerStatsSummary>);
    vi.mocked(useLedgerStatsByCategory).mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useLedgerStatsByCategory>);

    render(<LedgerAnalysisOverview year={2026} month={5} />);

    expect(useLedgerStatsSummary).toHaveBeenCalledWith({
      year: 2026,
      month: 5,
      bookId: undefined,
    });
    expect(screen.getByText("5월 전체 현금흐름")).toBeInTheDocument();
    expect(screen.getByText("2,700,000원")).toBeInTheDocument();
    expect(screen.getByText("공용 지출")).toBeInTheDocument();
    expect(screen.getByText("1,500,000원")).toBeInTheDocument();
    expect(screen.getByText("내 개인 지출")).toBeInTheDocument();
    expect(screen.getByText("300,000원")).toBeInTheDocument();
  });

  it("uses only the selected book without subtotals", () => {
    vi.mocked(useLedgerStatsSummary).mockReturnValue({
      data: { ...summary, bookId: BOOK },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useLedgerStatsSummary>);
    vi.mocked(useLedgerStatsByCategory).mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useLedgerStatsByCategory>);

    render(
      <LedgerAnalysisOverview
        year={2026}
        month={5}
        bookId={BOOK}
        bookName="여행"
      />,
    );

    expect(useLedgerStatsByCategory).toHaveBeenCalledWith({
      year: 2026,
      month: 5,
      type: "expense",
      bookId: BOOK,
    });
    expect(screen.getByText("5월 여행 현금흐름")).toBeInTheDocument();
    expect(screen.queryByText("공용 지출")).toBeNull();
  });

  it("가구가 없으면 설정 전 상태로 표시한다", () => {
    const error = new ApiQueryError(
      "HOUSEHOLD_NOT_FOUND",
      "가구 정보를 찾을 수 없습니다.",
      404,
    );
    vi.mocked(useLedgerStatsSummary).mockReturnValue({
      data: undefined,
      isLoading: false,
      error,
    } as unknown as ReturnType<typeof useLedgerStatsSummary>);
    vi.mocked(useLedgerStatsByCategory).mockReturnValue({
      data: undefined,
      isLoading: false,
      error,
    } as unknown as ReturnType<typeof useLedgerStatsByCategory>);

    render(<LedgerAnalysisOverview year={2026} month={5} />);

    expect(
      screen.getAllByText("가구 정보를 불러올 수 없어요").length,
    ).toBeGreaterThan(0);
  });
});
