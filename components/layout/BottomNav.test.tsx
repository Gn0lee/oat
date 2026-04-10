import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BottomNav } from "./BottomNav";

// next/navigation mock
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/home"),
}));

// next/link mock
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

import { usePathname } from "next/navigation";

describe("BottomNav", () => {
  it("4개의 네비게이션 항목을 렌더링한다", () => {
    render(<BottomNav />);

    expect(screen.getByText("홈")).toBeInTheDocument();
    expect(screen.getByText("가계부")).toBeInTheDocument();
    expect(screen.getByText("자산")).toBeInTheDocument();
    expect(screen.getByText("설정")).toBeInTheDocument();
  });

  it("분석, 가구 탭이 없다", () => {
    render(<BottomNav />);

    expect(screen.queryByText("분석")).not.toBeInTheDocument();
    expect(screen.queryByText("가구")).not.toBeInTheDocument();
  });

  it("4열 그리드로 렌더링된다", () => {
    const { container } = render(<BottomNav />);
    const grid = container.querySelector(".grid-cols-4");
    expect(grid).toBeInTheDocument();
  });

  it("현재 경로에 해당하는 탭이 활성 상태이다", () => {
    vi.mocked(usePathname).mockReturnValue("/home");
    render(<BottomNav />);

    const homeLink = screen.getByText("홈").closest("a");
    expect(homeLink?.className).toContain("text-primary");
  });

  it("하위 경로에서도 부모 탭이 활성 상태이다", () => {
    vi.mocked(usePathname).mockReturnValue("/assets/stock/holdings");
    render(<BottomNav />);

    const assetsLink = screen.getByText("자산").closest("a");
    expect(assetsLink?.className).toContain("text-primary");
  });

  it("safe-area-inset-bottom 패딩이 적용된다", () => {
    const { container } = render(<BottomNav />);
    const nav = container.querySelector("nav");
    expect(nav?.className).toContain("pb-[env(safe-area-inset-bottom)]");
  });

  it("/dashboard 경로에서 자산 탭이 활성 상태이다", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    render(<BottomNav />);

    const assetsLink = screen.getByText("자산").closest("a");
    expect(assetsLink?.className).toContain("text-primary");
  });

  it("/dashboard/stocks 하위 경로에서도 자산 탭이 활성 상태이다", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard/stocks");
    render(<BottomNav />);

    const assetsLink = screen.getByText("자산").closest("a");
    expect(assetsLink?.className).toContain("text-primary");
  });

  it("/household 경로에서 설정 탭이 활성 상태이다", () => {
    vi.mocked(usePathname).mockReturnValue("/household");
    render(<BottomNav />);

    const settingsLink = screen.getByText("설정").closest("a");
    expect(settingsLink?.className).toContain("text-primary");
  });
});
