import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useHomeSummary } from "@/hooks/use-home-summary";
import { HomePageClient } from "./HomePageClient";

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

vi.mock("@/hooks/use-home-summary", () => ({
  useHomeSummary: vi.fn(),
}));

describe("HomePageClient", () => {
  it("홈 요약을 불러오는 동안 스켈레톤을 표시한다", () => {
    vi.mocked(useHomeSummary).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useHomeSummary>);

    const { container } = render(<HomePageClient />);

    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBe(4);
    expect(screen.getByText("바로가기")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /가계부/ })).toHaveAttribute(
      "href",
      "/ledger",
    );
    expect(screen.getByRole("link", { name: /자산/ })).toHaveAttribute(
      "href",
      "/assets",
    );
  });

  it("홈 요약 조회에 실패하면 에러 상태와 주요 진입점을 표시한다", () => {
    vi.mocked(useHomeSummary).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("failed"),
    } as ReturnType<typeof useHomeSummary>);

    render(<HomePageClient />);

    expect(
      screen.getByText("홈 데이터를 불러오지 못했습니다."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /가계부/ })).toHaveAttribute(
      "href",
      "/ledger",
    );
  });

  it("홈 요약 데이터로 공용 현금흐름, 자산, 주요 지출을 렌더링한다", () => {
    vi.mocked(useHomeSummary).mockReturnValue({
      data: {
        year: 2026,
        month: 5,
        userName: "지호",
        cashFlow: {
          year: 2026,
          month: 5,
          shared: {
            totalIncome: 5_000_000,
            totalExpense: 2_800_000,
            balance: 2_200_000,
            savingsRate: 44,
          },
          personal: {
            totalIncome: 1_000_000,
            totalExpense: 400_000,
            balance: 600_000,
            savingsRate: 60,
          },
        },
        assets: {
          holdingCount: 4,
          totalInvested: 20_000_000,
        },
        topCategories: {
          type: "expense",
          scope: "shared",
          total: 120_000,
          items: [
            {
              categoryId: "food",
              categoryName: "식비",
              categoryIcon: null,
              amount: 120_000,
              percentage: 100,
              entryCount: 3,
            },
          ],
        },
        ledgerActivity: {
          hasRecentOwnLedgerActivity: true,
          lastOwnLedgerEntryCreatedAt: "2026-05-17T00:00:00.000Z",
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useHomeSummary>);

    render(<HomePageClient />);

    expect(
      screen.getByText("이번 달은 아직 2,200,000원 남았어요"),
    ).toBeInTheDocument();
    expect(screen.getByText("투자원금")).toBeInTheDocument();
    expect(screen.getByText("20,000,000원")).toBeInTheDocument();
    expect(screen.getByText("식비")).toBeInTheDocument();
    expect(screen.getByText("2,800,000원")).toBeInTheDocument();
    expect(screen.getByText("바로가기")).toBeInTheDocument();
    expect(screen.queryByText("4종목 · 2,000만")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /지출 분석/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /설정/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("지금 우리집 자산은")).not.toBeInTheDocument();
    expect(screen.queryByText(/수익률/)).not.toBeInTheDocument();
    expect(screen.queryByText("가족 지출")).not.toBeInTheDocument();
  });
});
