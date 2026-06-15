import { render, screen } from "@testing-library/react";
import { Bell, Settings } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import {
  AmountText,
  EntryRow,
  GroupedList,
  MetricBlock,
  MetricStrip,
  ScreenSection,
  ScreenState,
  SectionHeader,
} from ".";

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

describe("screen primitives", () => {
  it("renders EntryRow as a disclosure link with title, description, icon, and trailing content", () => {
    render(
      <EntryRow
        href="/settings/notifications"
        icon={Bell}
        title="알림 설정"
        description="Push 수신 여부 관리"
        trailing={<span>켜짐</span>}
      />,
    );

    const row = screen.getByRole("link", { name: /알림 설정/ });

    expect(row).toHaveAttribute("href", "/settings/notifications");
    expect(screen.getByText("Push 수신 여부 관리")).toBeInTheDocument();
    expect(screen.getByText("켜짐")).toBeInTheDocument();
    expect(row.querySelector(".lucide-bell")).toBeInTheDocument();
    expect(row.querySelector(".lucide-chevron-right")).toBeInTheDocument();
  });

  it("renders EntryRow as a disabled row and suppresses the disclosure affordance", () => {
    render(
      <EntryRow
        href="/settings/profile"
        icon={Settings}
        title="프로필"
        description="준비 중"
        disabled
      />,
    );

    expect(
      screen.queryByRole("link", { name: /프로필/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("준비 중")).toBeInTheDocument();
    expect(screen.queryByText("준비 중")).toHaveClass("text-gray-500");
  });

  it("renders GroupedList as a quiet row surface without default shadow", () => {
    render(
      <GroupedList data-testid="grouped-list">
        <EntryRow title="첫 번째" />
        <EntryRow title="두 번째" />
      </GroupedList>,
    );

    const list = screen.getByTestId("grouped-list");

    expect(list).toHaveClass("divide-y");
    expect(list.className).not.toContain("shadow");
  });

  it("renders ScreenSection and SectionHeader without wrapping the whole section in a card", () => {
    render(
      <ScreenSection data-testid="screen-section">
        <SectionHeader title="기능" description="자주 쓰는 작업" />
      </ScreenSection>,
    );

    const section = screen.getByTestId("screen-section");

    expect(screen.getByRole("heading", { name: "기능" })).toBeInTheDocument();
    expect(screen.getByText("자주 쓰는 작업")).toBeInTheDocument();
    expect(section.className).not.toContain("bg-white");
    expect(section.className).not.toContain("shadow");
  });

  it("renders ScreenState variants with optional action", () => {
    render(
      <ScreenState
        type="error"
        title="불러오지 못했어요"
        description="잠시 후 다시 시도해주세요."
        action={<button type="button">다시 시도</button>}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "불러오지 못했어요" }),
    ).toBeInTheDocument();
    expect(screen.getByText("잠시 후 다시 시도해주세요.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다시 시도" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("screen-state")).toHaveClass("border");
  });

  it("formats AmountText with semantic tone, sign, compactness, and overflow-safe classes", () => {
    render(<AmountText amount={1_250_000} compact sign="+" tone="income" />);

    const amount = screen.getByText(/\+/);

    expect(amount).toHaveClass("text-red-500");
    expect(amount).toHaveClass("tabular-nums");
    expect(amount).toHaveClass("[overflow-wrap:anywhere]");
    expect(amount.textContent).toContain("₩");
  });

  it("renders MetricBlock and MetricStrip as a customizable metric layout", () => {
    render(
      <MetricStrip columns={{ base: 2, md: 3 }} data-testid="metric-strip">
        <MetricBlock label="수입" value="3,200,000원" />
        <MetricBlock label="남은 금액" value="1,350,000원" emphasis />
      </MetricStrip>,
    );

    expect(screen.getByTestId("metric-strip")).toHaveClass("grid-cols-2");
    expect(screen.getByTestId("metric-strip")).toHaveClass("md:grid-cols-3");
    expect(screen.getByText("수입")).toBeInTheDocument();
    expect(screen.getByText("1,350,000원")).toHaveClass("text-xl");
  });
});
