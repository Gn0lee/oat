import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useStockAnalysis } from "@/hooks/use-stock-analysis";
import { MyStockSection } from "./MyStockSection";

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

describe("MyStockSection", () => {
  it("투자 현황 metric과 대표 보유 종목을 보여준다", () => {
    useStockAnalysisMock.mockReturnValue({
      isLoading: false,
      data: {
        summary: {
          totalValue: 1200000,
          totalInvested: 1000000,
          totalReturn: 200000,
          returnRate: 20,
          holdingCount: 2,
          missingPriceCount: 0,
          stalePriceCount: 0,
        },
        holdings: [
          {
            ticker: "005930",
            name: "삼성전자",
            market: "KR",
            currency: "KRW",
            quantity: 10,
            avgPrice: 70000,
            currentPrice: 80000,
            totalInvested: 700000,
            currentValue: 800000,
            returnAmount: 100000,
            returnRate: 14.2857,
            allocationPercent: 66.67,
            account: {
              id: "account-1",
              name: "삼성증권",
              broker: "삼성증권",
              ownerName: "지훈",
            },
          },
          {
            ticker: "AAPL",
            name: "Apple Inc.",
            market: "US",
            currency: "USD",
            quantity: 2,
            avgPrice: 100000,
            currentPrice: 200000,
            totalInvested: 300000,
            currentValue: 400000,
            returnAmount: 100000,
            returnRate: 33.3333,
            allocationPercent: 33.33,
            account: {
              id: "account-2",
              name: "토스증권",
              broker: "토스증권",
              ownerName: "지훈",
            },
          },
        ],
      },
    } as unknown as ReturnType<typeof useStockAnalysis>);

    render(<MyStockSection />);

    expect(screen.getByText("투자 현황")).toBeInTheDocument();
    expect(screen.getByText("평가금액")).toBeInTheDocument();
    expect(screen.getByText("평가손익")).toBeInTheDocument();
    expect(screen.getByText("삼성전자")).toBeInTheDocument();
    expect(screen.getByText("Apple Inc.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /종합 분석/ })).toHaveAttribute(
      "href",
      "/assets/stock/analysis/overview",
    );
  });

  it("보유 종목이 없으면 첫 거래 기록 링크를 보여준다", () => {
    useStockAnalysisMock.mockReturnValue({
      isLoading: false,
      data: {
        summary: {
          totalValue: 0,
          totalInvested: 0,
          totalReturn: 0,
          returnRate: 0,
          holdingCount: 0,
          missingPriceCount: 0,
          stalePriceCount: 0,
        },
        holdings: [],
      },
    } as unknown as ReturnType<typeof useStockAnalysis>);

    render(<MyStockSection />);

    expect(screen.getByText("아직 보유 종목이 없어요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /첫 거래 기록/ })).toHaveAttribute(
      "href",
      "/assets/stock/transactions/new/full",
    );
  });
});
