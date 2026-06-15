import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortfolioNavSection } from "./PortfolioNavSection";

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

describe("PortfolioNavSection", () => {
  it("핵심 주식 작업 진입점을 row로 렌더링한다", () => {
    render(<PortfolioNavSection />);

    expect(screen.getByRole("link", { name: /보유 현황/ })).toHaveAttribute(
      "href",
      "/assets/stock/holdings",
    );
    expect(screen.getByRole("link", { name: /거래 내역/ })).toHaveAttribute(
      "href",
      "/assets/stock/transactions",
    );
    expect(screen.getByRole("link", { name: /일별 기록/ })).toHaveAttribute(
      "href",
      "/assets/stock/records",
    );
    expect(screen.getByRole("link", { name: /주식 분석/ })).toHaveAttribute(
      "href",
      "/assets/stock/analysis",
    );
  });

  it("관리와 시장 동향 진입점을 렌더링한다", () => {
    render(<PortfolioNavSection />);

    expect(screen.getByRole("link", { name: /계좌 관리/ })).toHaveAttribute(
      "href",
      "/assets/stock/accounts",
    );
    expect(screen.getByRole("link", { name: /종목 설정/ })).toHaveAttribute(
      "href",
      "/assets/stock/settings",
    );
    expect(screen.getByRole("link", { name: /시장 동향/ })).toHaveAttribute(
      "href",
      "/assets/stock/market",
    );
  });
});
