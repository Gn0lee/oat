import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useLedgerStatsTrend } from "@/hooks/use-ledger-stats";
import { TrendClient } from "./TrendClient";

vi.mock("@/hooks/use-ledger-stats", () => ({
  useLedgerStatsTrend: vi.fn(),
}));

const BOOK = "00000000-0000-4000-8000-000000000001";
vi.mock("next/navigation", () => ({
  usePathname: () => "/ledger/analysis/trend",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () =>
    new URLSearchParams("book=00000000-0000-4000-8000-000000000001"),
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

    render(<TrendClient />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("월별 상세")).toBeInTheDocument();
    expect(screen.getByText("2026년 5월")).toBeInTheDocument();
    expect(screen.getByText("수입")).toBeInTheDocument();
    expect(screen.getByText("지출")).toBeInTheDocument();
    expect(screen.getByText("저축률")).toBeInTheDocument();
    expect(screen.getByText("30.0%")).toBeInTheDocument();
  });

  it("asks before navigating from monthly detail income and expense", async () => {
    const user = userEvent.setup();
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

    render(<TrendClient />);

    await user.click(screen.getByRole("button", { name: /수입/ }));

    expect(screen.getByText("기록 화면으로 이동할까요?")).toBeInTheDocument();
    expect(
      screen.getByText("2026년 5월 수입 기록을 확인합니다."),
    ).toBeInTheDocument();
    expect(useLedgerStatsTrend).toHaveBeenCalledWith({
      months: 6,
      bookId: BOOK,
    });
    expect(screen.getByRole("link", { name: "이동하기" })).toHaveAttribute(
      "href",
      `/ledger/records?book=${BOOK}&date=2026-05-31&type=income`,
    );
  });
});
