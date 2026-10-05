import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { LedgerDateStrip } from "./LedgerDateStrip";

function entry(
  type: LedgerEntryWithDetails["type"],
  amount: number,
): LedgerEntryWithDetails {
  return { type, amount } as LedgerEntryWithDetails;
}

const entriesByDate = new Map<string, LedgerEntryWithDetails[]>([
  [
    "2026-10-04",
    [
      entry("expense", 231700),
      entry("income", 100025),
      entry("transfer", 999),
      entry("non_expense_withdrawal", 888),
    ],
  ],
  ["2026-10-20", [entry("expense", 1250000)]],
]);

function renderStrip(
  props: Partial<React.ComponentProps<typeof LedgerDateStrip>> = {},
) {
  const onSelect = vi.fn();
  const onViewChange = vi.fn();
  render(
    <LedgerDateStrip
      selectedDate="2026-10-04"
      today="2026-10-05"
      view="week"
      entriesByDate={entriesByDate}
      onSelect={onSelect}
      onViewChange={onViewChange}
      {...props}
    />,
  );
  return { onSelect, onViewChange };
}

describe("LedgerDateStrip", () => {
  it("주간 보기는 선택한 날이 속한 한 주 7칸만 보여준다", () => {
    renderStrip();
    const days = screen.getAllByRole("button", { name: /^10월 \d+일/ });
    expect(days.map((day) => day.textContent?.match(/^\d+/)?.[0])).toEqual([
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
    ]);
  });

  it("다른 달에 속한 칸은 비워 둔다", () => {
    renderStrip({ selectedDate: "2026-10-01" });
    // 2026-10-01은 목요일: 일~수는 9월이라 버튼이 없다.
    const days = screen.getAllByRole("button", { name: /^10월 \d+일/ });
    expect(days).toHaveLength(3);
    expect(days[0]).toHaveAccessibleName(/^10월 1일 목요일/);
  });

  it("날짜 밑에 지출(무채색)·수입(빨강)을 따로 표시하고 이체·비지출 출금은 뺀다", () => {
    renderStrip();
    const day = screen.getByRole("button", { name: /^10월 4일/ });
    expect(day).toHaveAccessibleName(
      "10월 4일 일요일, 지출 231,700원, 수입 100,025원",
    );
    expect(within(day).getByText("-231,700")).toHaveClass("text-gray-600");
    expect(within(day).getByText("+100,025")).toHaveClass("text-red-600");
    expect(within(day).queryByText(/999|888/)).toBeNull();
  });

  it("백만 원 이상은 만 단위로 줄여 칸을 넘지 않는다", () => {
    renderStrip({ selectedDate: "2026-10-20" });
    expect(screen.getByText("-125만")).toBeInTheDocument();
  });

  it("선택한 날은 aria-pressed, 오늘은 aria-current로 알린다", () => {
    renderStrip();
    expect(screen.getByRole("button", { name: /^10월 4일/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /^10월 5일/ })).toHaveAttribute(
      "aria-current",
      "date",
    );
  });

  it("날짜를 누르면 YYYY-MM-DD로 알린다", () => {
    const { onSelect } = renderStrip();
    fireEvent.click(screen.getByRole("button", { name: /^10월 7일/ }));
    expect(onSelect).toHaveBeenCalledWith("2026-10-07");
  });

  it("펼치기 버튼으로 월간 보기를 요청한다", () => {
    const { onViewChange } = renderStrip();
    const toggle = screen.getByRole("button", { name: "월간 달력 펼치기" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(onViewChange).toHaveBeenCalledWith("month");
  });

  it("월간 보기는 그 달 전체를 보여주고 접기 버튼을 둔다", () => {
    const { onViewChange } = renderStrip({ view: "month" });
    expect(screen.getAllByRole("button", { name: /^10월 \d+일/ })).toHaveLength(
      31,
    );
    const toggle = screen.getByRole("button", { name: "주간 달력으로 접기" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(onViewChange).toHaveBeenCalledWith("week");
  });

  it("날짜와 토글 버튼은 44px 이상이다", () => {
    renderStrip();
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveClass("min-h-11");
    }
  });
});
