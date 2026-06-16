import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useStockAnalysis } from "@/hooks/use-stock-analysis";
import { StockOverviewTopPerformersSection } from "./StockOverviewTopPerformersSection";

vi.mock("@/hooks/use-stock-analysis", () => ({
  useStockAnalysis: vi.fn(),
}));

vi.mock("./StockOverviewDetailDrawer", () => ({
  StockOverviewDetailDrawer: () => <div data-testid="detail-drawer" />,
}));

const useStockAnalysisMock = vi.mocked(useStockAnalysis);

describe("StockOverviewTopPerformersSection", () => {
  it("renders gainer and loser rows with rate and compact amount separately", () => {
    useStockAnalysisMock.mockReturnValue({
      isLoading: false,
      data: {
        byTicker: [
          {
            ticker: "111111",
            name: "대박주식",
            market: "KR",
            currency: "KRW",
            quantity: 100,
            avgPrice: 1000,
            totalInvested: 100000,
            currentValue: 30708000,
            returnAmount: 3060800, // 306.08만원
            returnRate: 291.73,
            allocationPercent: 50,
          },
          {
            ticker: "222222",
            name: "쪽박주식",
            market: "KR",
            currency: "KRW",
            quantity: 100,
            avgPrice: 3000,
            totalInvested: 300000,
            currentValue: 150000,
            returnAmount: -150000, // -15만원
            returnRate: -50.25,
            allocationPercent: 50,
          },
        ],
      },
    } as unknown as ReturnType<typeof useStockAnalysis>);

    render(<StockOverviewTopPerformersSection />);

    // Verify section header
    expect(screen.getByText("상위 성과 종목")).toBeInTheDocument();
    expect(screen.getByText("수익 TOP 5")).toBeInTheDocument();
    expect(screen.getByText("손실 TOP 5")).toBeInTheDocument();

    // Verify gainer details
    const gainerRate = screen.getByText("+291.73%");
    const gainerAmount = screen.getByText("306만원");

    expect(gainerRate).toBeInTheDocument();
    expect(gainerAmount).toBeInTheDocument();
    expect(gainerAmount.textContent).not.toContain("+");

    // Check that rate and amount are not joined as a single text node containing "%+"
    const containerText = screen
      .getByText("대박주식")
      .closest("button")?.textContent;
    expect(containerText).not.toMatch(/%\+/);

    // Verify loser details (must keep minus signs on both)
    const loserRate = screen.getByText("-50.25%");
    const loserAmount = screen.getByText("-15만원");

    expect(loserRate).toBeInTheDocument();
    expect(loserAmount).toBeInTheDocument();
  });
});
