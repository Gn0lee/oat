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

const summary = {
  year: 2026,
  month: 5,
  totalIncome: 4_000_000,
  totalSharedExpense: 1_500_000,
  totalPersonalExpense: 300_000,
  totalTransfer: 0,
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
      <LedgerAnalysisOverview year={2026} month={5} scope="shared" />,
    );

    expect(
      container.querySelectorAll("[data-slot='skeleton']").length,
    ).toBeGreaterThan(0);
  });

  it("개인 scope에서는 개인 지출 요약 문구를 사용한다", () => {
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

    render(<LedgerAnalysisOverview year={2026} month={5} scope="personal" />);

    expect(screen.getByText("5월 내 개인 지출")).toBeInTheDocument();
    expect(
      screen.getByText("이번 달 주요 개인 지출이 없어요"),
    ).toBeInTheDocument();
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

    render(<LedgerAnalysisOverview year={2026} month={5} scope="shared" />);

    expect(
      screen.getAllByText("가구 정보를 불러올 수 없어요").length,
    ).toBeGreaterThan(0);
  });
});
