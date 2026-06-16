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
    expect(screen.getByText("자산 관리")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /주식/ })).toHaveAttribute(
      "href",
      "/assets/stock",
    );
    expect(screen.getByRole("link", { name: /현금\/계좌/ })).toHaveAttribute(
      "href",
      "/assets/accounts",
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
    expect(screen.getByRole("link", { name: /주식/ })).toHaveAttribute(
      "href",
      "/assets/stock",
    );
  });

  it("자산 요약 데이터와 description-only 자산 진입점을 렌더링한다", () => {
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
    expect(screen.getAllByText("24,000,000원")).toHaveLength(1);
    expect(screen.getByText("자산 관리")).toBeInTheDocument();
    expect(
      screen.getByText("보유 종목과 거래 내역을 관리해요"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("계좌와 현금성 자산을 관리해요"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("준비 중").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("4종목")).not.toBeInTheDocument();
    expect(screen.queryByText("2계좌")).not.toBeInTheDocument();
    expect(screen.queryByText("관리하기")).not.toBeInTheDocument();
  });
});
