import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAssetsSummary } from "@/hooks/use-assets-summary";
import { AssetsPageClient } from "./AssetsPageClient";

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

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
  },
}));

vi.mock("@/hooks/use-assets-summary", () => ({
  useAssetsSummary: vi.fn(),
}));

describe("AssetsPageClient", () => {
  it("자산 요약을 불러오는 동안 스켈레톤을 표시한다", () => {
    vi.mocked(useAssetsSummary).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useAssetsSummary>);

    const { container } = render(<AssetsPageClient />);

    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBe(1);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );
  });

  it("자산 요약 조회에 실패하면 에러 상태를 표시한다", () => {
    vi.mocked(useAssetsSummary).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("failed"),
    } as ReturnType<typeof useAssetsSummary>);

    render(<AssetsPageClient />);

    expect(
      screen.getByText("자산 데이터를 불러오지 못했습니다."),
    ).toBeInTheDocument();
  });

  it("자산 요약 데이터로 총 자산, 주식, 계좌 항목을 렌더링한다", () => {
    vi.mocked(useAssetsSummary).mockReturnValue({
      data: {
        portfolio: {
          holdingCount: 4,
          totalValue: 24_000_000,
          totalInvested: 20_000_000,
          returnRate: 20,
        },
        accountCount: 2,
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAssetsSummary>);

    render(<AssetsPageClient />);

    expect(screen.getByText("총 자산")).toBeInTheDocument();
    expect(screen.getAllByText("₩24,000,000")).toHaveLength(2);
    expect(screen.getByText("4종목")).toBeInTheDocument();
    expect(screen.getByText("2계좌")).toBeInTheDocument();
    expect(screen.getByText("관리하기")).toBeInTheDocument();
  });
});
