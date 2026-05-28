import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServiceHeader } from "./ServiceHeader";

const navigationState = vi.hoisted(() => ({
  pathname: "/home",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
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

describe("ServiceHeader", () => {
  it("mobile top-level 화면에는 oat 로고를 렌더링한다", () => {
    navigationState.pathname = "/assets";

    render(<ServiceHeader variant="mobile" />);

    expect(screen.getByText("oat").closest("a")).toHaveAttribute(
      "href",
      "/home",
    );
  });

  it("mobile child 화면에는 뒤로가기와 화면 제목을 렌더링한다", () => {
    navigationState.pathname = "/assets/stock/holdings";

    render(<ServiceHeader variant="mobile" />);

    expect(screen.getByText("보유 종목")).toBeInTheDocument();
    expect(screen.getByLabelText("이전 화면으로 이동")).toHaveAttribute(
      "href",
      "/assets/stock",
    );
  });

  it("mobile child 화면 제목을 뒤로가기 버튼 옆에 왼쪽 정렬한다", () => {
    navigationState.pathname = "/assets/stock/holdings";

    render(<ServiceHeader variant="mobile" />);

    expect(screen.getByRole("banner")).toHaveClass("flex");
    expect(screen.getByText("보유 종목")).toHaveClass("flex-1");
    expect(
      screen.getByLabelText("이전 화면으로 이동").querySelector("svg"),
    ).toHaveClass("lucide-chevron-left");
  });

  it("mobile task 화면에는 Close Action을 렌더링한다", () => {
    navigationState.pathname = "/ledger/payment-methods/new";

    render(<ServiceHeader variant="mobile" />);

    expect(screen.getByText("결제수단 추가")).toBeInTheDocument();
    expect(screen.getByLabelText("작업 닫기")).toHaveAttribute(
      "href",
      "/ledger/payment-methods",
    );
  });

  it("ledger analysis 하위 화면의 scope 쿼리를 back href에 유지한다", async () => {
    navigationState.pathname = "/ledger/analysis/by-category";
    window.history.pushState(
      {},
      "",
      "/ledger/analysis/by-category?scope=personal",
    );

    render(<ServiceHeader variant="mobile" />);

    await waitFor(() =>
      expect(screen.getByLabelText("이전 화면으로 이동")).toHaveAttribute(
        "href",
        "/ledger/analysis?scope=personal",
      ),
    );
  });

  it("desktop 화면에는 breadcrumb를 렌더링한다", () => {
    navigationState.pathname = "/assets/stock/analysis";

    render(<ServiceHeader variant="desktop" />);

    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toHaveTextContent("자산주식주식 분석");
  });
});
