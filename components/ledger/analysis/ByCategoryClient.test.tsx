import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLedgerStatsByCategory } from "@/hooks/use-ledger-stats";
import { ByCategoryClient } from "./ByCategoryClient";

vi.mock("@/hooks/use-ledger-stats", () => ({
  useLedgerStatsByCategory: vi.fn(),
}));

const replace = vi.fn();
const url = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/ledger/analysis/by-category",
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(url.search),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  useReducedMotion: () => false,
  motion: {
    li: ({
      children,
      className,
    }: {
      children: ReactNode;
      className?: string;
    }) => <li className={className}>{children}</li>,
    div: ({
      children,
      className,
    }: {
      children: ReactNode;
      className?: string;
    }) => (
      <div className={className} data-motion="div">
        {children}
      </div>
    ),
  },
}));

vi.mock("recharts", () => ({
  Bar: () => null,
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Cell: () => null,
  Pie: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
}));

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

vi.mock("./MonthSelector", () => ({
  MonthSelector: () => null,
}));

vi.mock("./LedgerStatsDetailDrawer", () => ({
  LedgerStatsDetailDrawer: ({
    open,
    title,
    expectedCount,
  }: {
    open: boolean;
    title: string;
    expectedCount?: number;
  }) =>
    open ? (
      <div data-expected-count={expectedCount} data-testid="detail-drawer">
        {title}
      </div>
    ) : null,
}));

const currentData = {
  type: "expense" as const,
  bookId: null,
  total: 76_300,
  items: [
    {
      categoryId: "food",
      categoryName: "식비",
      categoryIcon: "utensils",
      amount: 60_500,
      percentage: 79.3,
      entryCount: 2,
      directAmount: 0,
      directEntryCount: 0,
      children: [
        {
          categoryId: "grocery",
          categoryName: "장보기",
          categoryIcon: "shopping-basket",
          amount: 35_000,
          percentage: 45.9,
          entryCount: 1,
        },
        {
          categoryId: "dining",
          categoryName: "외식",
          categoryIcon: "store",
          amount: 25_500,
          percentage: 33.4,
          entryCount: 1,
        },
      ],
    },
    {
      categoryId: "medical",
      categoryName: "의료비",
      categoryIcon: "stethoscope",
      amount: 15_800,
      percentage: 20.7,
      entryCount: 1,
      directAmount: 15_800,
      directEntryCount: 1,
      children: [],
    },
  ],
};

describe("ByCategoryClient", () => {
  beforeEach(() => {
    url.search = "";
    replace.mockClear();
    vi.mocked(useLedgerStatsByCategory).mockReturnValue({
      data: currentData,
      isLoading: false,
    } as unknown as ReturnType<typeof useLedgerStatsByCategory>);
  });

  it("child breakdown을 접어두고 parent를 누르면 금액과 비중을 펼친다", async () => {
    const user = userEvent.setup();

    const { container } = render(<ByCategoryClient />);

    expect(screen.queryByText("직접 0건")).not.toBeInTheDocument();
    expect(screen.queryByText("장보기")).not.toBeInTheDocument();
    expect(container.querySelector("[style*='width']")).not.toBeInTheDocument();

    const food = screen.getByRole("button", {
      name: /식비.*60,500원.*2건/,
    });
    expect(food).toHaveAttribute("aria-expanded", "false");

    await user.click(food);

    expect(food).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelector("[data-motion='div']")).toBeInTheDocument();
    expect(screen.getByText("장보기")).toBeInTheDocument();
    expect(screen.getByText("35,000원")).toBeInTheDocument();
    expect(screen.getByText("식비의 57.9% · 1건")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "전체 2건 보기" }),
    ).toBeInTheDocument();
  });

  it("child가 없는 parent는 accordion 없이 상세 내역을 연다", async () => {
    const user = userEvent.setup();

    render(<ByCategoryClient />);

    const medical = screen.getByRole("button", {
      name: /의료비.*15,800원.*1건/,
    });
    expect(medical).not.toHaveAttribute("aria-expanded");
    expect(medical.querySelector(".lucide-chevron-right")).toBeInTheDocument();

    await user.click(medical);

    expect(screen.getByTestId("detail-drawer")).toHaveTextContent(
      "의료비 기록",
    );
    expect(screen.getByTestId("detail-drawer")).toHaveAttribute(
      "data-expected-count",
      "1",
    );
  });

  it("reads the book, period and type from the URL and writes a type change back", async () => {
    const user = userEvent.setup();
    const book = "00000000-0000-4000-8000-000000000001";
    url.search = `book=${book}&year=2026&month=4&type=income`;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    Element.prototype.scrollIntoView ??= () => {};

    render(<ByCategoryClient />);

    expect(useLedgerStatsByCategory).toHaveBeenCalledWith({
      year: 2026,
      month: 4,
      type: "income",
      bookId: book,
    });
    expect(useLedgerStatsByCategory).toHaveBeenCalledWith({
      year: 2026,
      month: 3,
      type: "income",
      bookId: book,
    });

    await user.click(screen.getByRole("button", { name: /개 선택/ }));
    await user.click(screen.getByRole("button", { name: "지출" }));

    expect(replace).toHaveBeenCalledWith(
      `/ledger/analysis/by-category?book=${book}&year=2026&month=4&type=expense`,
      { scroll: false },
    );
    vi.unstubAllGlobals();
  });
});
