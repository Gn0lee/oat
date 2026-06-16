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
          totalValue: 123456789,
          totalInvested: 88888888,
          totalReturn: 99999999,
          returnRate: 123.45,
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

    // Verify full metric KRW uses 원, no ₩
    const totalValueText = screen.getByText("123,456,789원");
    expect(totalValueText).toBeInTheDocument();
    expect(totalValueText).not.toHaveTextContent("₩");
    expect(totalValueText).toHaveClass("text-base");

    // Verify gain and return rate use increase tone (text-red-500)
    const returnText = screen.getByText("+99,999,999원");
    expect(returnText).toHaveClass("text-red-500");
    expect(returnText).toHaveClass("text-base");

    const rateText = screen.getByText("+123.45%");
    expect(rateText).toHaveClass("text-red-500");
    expect(rateText).toHaveClass("text-base");
  });
});
