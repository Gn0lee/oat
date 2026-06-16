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
            ticker: "MSFT",
            name: "Microsoft Corporation Long Name",
            market: "US",
            currency: "USD",
            quantity: 10,
            avgPrice: 300,
            currentPrice: 400,
            totalInvested: 3000,
            currentValue: 4000,
            returnAmount: 1000,
            returnRate: 33.33,
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

    const { container } = render(<MyStockSection />);

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

    // Verify holding chart icon is not rendered (no lucide-bar-chart3/chart-column)
    expect(
      container.querySelector(
        ".lucide-chart-column, .lucide-bar-chart-3, .lucide-bar-chart3",
      ),
    ).not.toBeInTheDocument();

    // Verify holding name line clamp and break words, and not break-all
    const longName = screen.getByText("Microsoft Corporation Long Name");
    expect(longName).toHaveClass("line-clamp-2");
    expect(longName).toHaveClass("break-words");
    expect(longName).not.toHaveClass("[word-break:break-all]");

    // Verify holding currentValue is compact and has full amount title
    const microsoftValueCompact = screen.getByText("$4.00K");
    expect(microsoftValueCompact).toBeInTheDocument();
    expect(microsoftValueCompact.closest("[title]")).toHaveAttribute(
      "title",
      "US$4,000.00",
    );

    // Verify sign policy: positive has no +, negative has -
    const positiveReturnCompact = screen.getByText("$1.00K");
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
