import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useStockAnalysis } from "@/hooks/use-stock-analysis";
import { StockOverviewSummarySection } from "./StockOverviewSummarySection";

vi.mock("@/hooks/use-stock-analysis", () => ({
  useStockAnalysis: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const useStockAnalysisMock = vi.mocked(useStockAnalysis);

describe("StockOverviewSummarySection", () => {
  it("평가금액, 투자원금, 평가손익, 수익률 metric을 보여준다", () => {
    useStockAnalysisMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        summary: {
          totalValue: 1500000,
          totalInvested: 1000000,
          totalReturn: 500000,
          returnRate: 50,
          holdingCount: 3,
          missingPriceCount: 1,
          stalePriceCount: 2,
        },
      },
    } as unknown as ReturnType<typeof useStockAnalysis>);

    render(<StockOverviewSummarySection />);

    expect(screen.getByText("평가금액")).toBeInTheDocument();
    expect(screen.getByText("투자원금")).toBeInTheDocument();
    expect(screen.getByText("평가손익")).toBeInTheDocument();
    expect(screen.getByText("수익률")).toBeInTheDocument();
    expect(screen.getByText("1종목 현재가 없음")).toBeInTheDocument();
    expect(screen.getByText("2종목 이전 가격 기준")).toBeInTheDocument();
  });
});
