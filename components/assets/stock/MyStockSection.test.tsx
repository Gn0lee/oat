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
          totalValue: 123456789,
          totalInvested: 88888888,
          totalReturn: 99999999,
          returnRate: 123.45,
          holdingCount: 2,
          missingPriceCount: 0,
          stalePriceCount: 0,
        },
        holdings: [
          {
            ticker: "005930",
            name: "아주아주아주아주아주긴이름의삼성전자주식",
            market: "KR",
            currency: "KRW",
            quantity: 10,
            avgPrice: 7000000,
            currentPrice: 8000000,
            totalInvested: 70000000,
            currentValue: 80000000,
            returnAmount: 10000000,
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
            currentPrice: 50000,
            totalInvested: 300000,
            currentValue: 100000,
            returnAmount: -200000,
            returnRate: -66.6667,
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
    expect(screen.getByText("투자원금")).toBeInTheDocument();
    expect(screen.getByText("평가손익")).toBeInTheDocument();
    expect(screen.getByText("수익률")).toBeInTheDocument();

    // Verify full metric amounts render with 원 and no ₩
    const totalValueText = screen.getByText("123,456,789원");
    expect(totalValueText).toBeInTheDocument();
    expect(totalValueText).not.toHaveTextContent("₩");
    // Verify metric-safe typography (text-base) is applied
    expect(totalValueText).toHaveClass("text-base");

    // Verify holding name line clamp and word break
    const longName = screen.getByText(
      "아주아주아주아주아주긴이름의삼성전자주식",
    );
    expect(longName).toHaveClass("line-clamp-2");

    // Verify holding currentValue is compact and has full amount title
    const samsungValueCompact = screen.getByText("8000만원");
    expect(samsungValueCompact).toBeInTheDocument();
    expect(samsungValueCompact.closest("[title]")).toHaveAttribute(
      "title",
      "80,000,000원",
    );

    // Verify sign policy: positive has no +, negative has -
    const positiveReturnCompact = screen.getByText("1000만원");
    expect(positiveReturnCompact).toBeInTheDocument();
    expect(positiveReturnCompact.textContent).not.toContain("+");

    const negativeReturnCompact = screen.getByText(/-\$200(\.00)?K/);
    expect(negativeReturnCompact).toBeInTheDocument();
    expect(negativeReturnCompact.closest("[title]")).toHaveAttribute(
      "title",
      expect.stringContaining("200,000"),
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
