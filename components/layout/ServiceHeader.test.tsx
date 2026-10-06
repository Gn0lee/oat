import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServiceHeader } from "./ServiceHeader";

const navigationState = vi.hoisted(() => ({
  pathname: "/home",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
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

function renderServiceHeader(
  variant: "mobile" | "desktop",
  placement?: "fixed" | "scroll",
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ServiceHeader variant={variant} placement={placement} />
    </QueryClientProvider>,
  );
}

describe("ServiceHeader", () => {
  it("mobile top-level 화면에는 oat 로고를 렌더링한다", () => {
    navigationState.pathname = "/assets";

    renderServiceHeader("mobile");

    expect(screen.getByText("oat").closest("a")).toHaveAttribute(
      "href",
      "/home",
    );
  });

  it("mobile child 화면에는 뒤로가기와 화면 제목을 렌더링한다", () => {
    navigationState.pathname = "/assets/stock/holdings";

    renderServiceHeader("mobile");

    expect(screen.getByText("보유 종목")).toBeInTheDocument();
    expect(screen.getByLabelText("이전 화면으로 이동")).toHaveAttribute(
      "href",
      "/assets/stock",
    );
  });

  it("mobile child 화면 제목을 뒤로가기 버튼 옆에 왼쪽 정렬한다", () => {
    navigationState.pathname = "/assets/stock/holdings";

    renderServiceHeader("mobile");

    expect(screen.getByRole("banner")).toHaveClass("flex");
    expect(screen.getByText("보유 종목")).toHaveClass("flex-1");
    expect(
      screen.getByLabelText("이전 화면으로 이동").querySelector("svg"),
    ).toHaveClass("lucide-chevron-left");
  });

  it("mobile task 화면에는 Close Action을 렌더링한다", () => {
    navigationState.pathname = "/ledger/payment-methods/new";

    renderServiceHeader("mobile");

    expect(screen.getByText("결제수단 추가")).toBeInTheDocument();
    expect(screen.getByLabelText("작업 닫기")).toHaveAttribute(
      "href",
      "/ledger/payment-methods",
    );
  });

  it("ledger composer back and close actions are delegated to the active task", () => {
    navigationState.pathname = "/ledger/records/new/daily";
    const onBack = vi.fn();
    const onClose = vi.fn();
    window.addEventListener("oat:ledger-composer-back", onBack);
    window.addEventListener("oat:ledger-composer-close", onClose);

    renderServiceHeader("mobile");
    fireEvent.click(screen.getByLabelText("이전 화면으로 이동"));
    fireEvent.click(screen.getByLabelText("작업 닫기"));

    expect(onBack).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    window.removeEventListener("oat:ledger-composer-back", onBack);
    window.removeEventListener("oat:ledger-composer-close", onClose);
  });

  it("ledger analysis 하위 화면의 장부·기간 쿼리를 back href에 유지한다", async () => {
    navigationState.pathname = "/ledger/analysis/by-category";
    window.history.pushState(
      {},
      "",
      "/ledger/analysis/by-category?book=book-1&year=2026&month=4&type=income",
    );

    renderServiceHeader("mobile");

    await waitFor(() =>
      expect(screen.getByLabelText("이전 화면으로 이동")).toHaveAttribute(
        "href",
        "/ledger/analysis?book=book-1&year=2026&month=4",
      ),
    );
  });

  it("기록 조회 화면에서는 고정 위치 모바일 헤더를 렌더링하지 않는다", () => {
    navigationState.pathname = "/ledger/records";

    renderServiceHeader("mobile");

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });

  it("기록 조회 화면에서는 스크롤 영역 안의 헤더가 뒤로가기와 제목을 보여준다", () => {
    navigationState.pathname = "/ledger/records";

    renderServiceHeader("mobile", "scroll");

    expect(screen.getByText("기록 조회")).toBeInTheDocument();
    expect(screen.getByLabelText("이전 화면으로 이동")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveClass("absolute");
  });

  it("다른 화면에서는 스크롤 영역 안의 헤더를 렌더링하지 않는다", () => {
    navigationState.pathname = "/assets/stock/holdings";

    renderServiceHeader("mobile", "scroll");

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });

  it("기록 상세 화면의 헤더는 그대로 고정 위치다", () => {
    navigationState.pathname = "/ledger/records/entry-1";

    renderServiceHeader("mobile");

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("desktop 화면에는 breadcrumb를 렌더링한다", () => {
    navigationState.pathname = "/assets/stock/analysis";

    renderServiceHeader("desktop");

    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toHaveTextContent("자산주식주식 분석");
  });
});
