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
  it("주식 분석 진입점을 항상 렌더링한다", () => {
    render(<PortfolioNavSection />);

    expect(screen.getByRole("link", { name: /주식 분석/ })).toHaveAttribute(
      "href",
      "/assets/stock/analysis",
    );
  });

  it("주식 일별 기록 진입점을 렌더링한다", () => {
    render(<PortfolioNavSection />);

    expect(screen.getByRole("link", { name: /일별 기록/ })).toHaveAttribute(
      "href",
      "/assets/stock/records",
    );
  });
});
