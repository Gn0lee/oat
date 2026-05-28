import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useLedgerStatsTrend } from "@/hooks/use-ledger-stats";
import { TrendClient } from "./TrendClient";

vi.mock("@/hooks/use-ledger-stats", () => ({
  useLedgerStatsTrend: vi.fn(),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

describe("TrendClient", () => {
  it("renders monthly detail as metric list instead of a table", () => {
    vi.mocked(useLedgerStatsTrend).mockReturnValue({
      data: {
        items: [
          {
            year: 2026,
            month: 5,
            totalIncome: 4_000_000,
            totalExpense: 2_800_000,
            balance: 1_200_000,
            savingsRate: 30,
          },
        ],
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useLedgerStatsTrend>);

    render(<TrendClient scope="shared" />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("월별 상세")).toBeInTheDocument();
    expect(screen.getByText("2026년 5월")).toBeInTheDocument();
    expect(screen.getByText("수입")).toBeInTheDocument();
    expect(screen.getByText("지출")).toBeInTheDocument();
    expect(screen.getByText("저축률")).toBeInTheDocument();
    expect(screen.getByText("30.0%")).toBeInTheDocument();
  });
});
