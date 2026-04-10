import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/home"),
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

import { usePathname } from "next/navigation";

describe("Sidebar", () => {
  it("4개의 네비게이션 항목을 렌더링한다", () => {
    render(<Sidebar />);

    expect(screen.getByText("홈")).toBeInTheDocument();
    expect(screen.getByText("가계부")).toBeInTheDocument();
    expect(screen.getByText("자산")).toBeInTheDocument();
    expect(screen.getByText("설정")).toBeInTheDocument();
  });

  it("분석, 가구 탭이 없다", () => {
    render(<Sidebar />);

    expect(screen.queryByText("분석")).not.toBeInTheDocument();
    expect(screen.queryByText("가구")).not.toBeInTheDocument();
  });

  it("현재 경로에 해당하는 항목이 활성 상태이다", () => {
    vi.mocked(usePathname).mockReturnValue("/assets");
    render(<Sidebar />);

    const assetsLink = screen.getByText("자산").closest("a");
    expect(assetsLink?.className).toContain("bg-primary/10");
    expect(assetsLink?.className).toContain("text-primary");
  });

  it("하위 경로에서도 부모 항목이 활성 상태이다", () => {
    vi.mocked(usePathname).mockReturnValue("/ledger/detail");
    render(<Sidebar />);

    const ledgerLink = screen.getByText("가계부").closest("a");
    expect(ledgerLink?.className).toContain("bg-primary/10");
  });
});
