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
  ["2026-10-11", [entry("expense", 999)]],
  ["2026-10-12", [entry("expense", 1000)]],
  ["2026-10-13", [entry("expense", 99_999_999)]],
  ["2026-10-14", [entry("expense", 100_000_000)]],
  ["2026-10-15", [entry("income", 110_000_000)]],
  ["2026-10-16", [entry("expense", 10_000)]],
  ["2026-10-17", [entry("expense", 28_990)]],
  ["2026-10-20", [entry("expense", 1250000)]],
  ["2026-09-30", [entry("expense", 5000)]],
]);

function renderStrip(
  props: Partial<React.ComponentProps<typeof LedgerDateStrip>> = {},
) {
  const onSelect = vi.fn();
  render(
    <LedgerDateStrip
      selectedDate="2026-10-04"
      today="2026-10-05"
      entriesByDate={entriesByDate}
      onSelect={onSelect}
      {...props}
    />,
  );
  return { onSelect };
}

function dayButtons() {
  return screen.getAllByRole("button", { name: /^\d+월 \d+일/ });
}

describe("LedgerDateStrip", () => {
  it("주간 보기는 선택한 날이 속한 한 주 7칸만 보여준다", () => {
    renderStrip();
    expect(
      dayButtons().map((day) => day.textContent?.match(/^\d+/)?.[0]),
    ).toEqual(["4", "5", "6", "7", "8", "9", "10"]);
  });

  it("다른 달 날짜는 흐린 숫자만 보이고 금액 없이 누를 수 없다", () => {
    const { onSelect } = renderStrip({ selectedDate: "2026-10-01" });
    // 2026-10-01은 목요일: 일~수는 9월 27~30일이다.
    const days = dayButtons();
    expect(days).toHaveLength(7);
    const lastOfSeptember = screen.getByRole("button", {
      name: "9월 30일 수요일",
    });
    expect(lastOfSeptember).toBeDisabled();
    expect(lastOfSeptember).toHaveTextContent(/^30$/);
    expect(within(lastOfSeptember).getByText("30")).toHaveClass(
      "text-gray-300",
    );
    fireEvent.click(lastOfSeptember);
    expect(onSelect).not.toHaveBeenCalled();
    expect(days[4]).toHaveAccessibleName(/^10월 1일 목요일/);
    expect(days[4]).toBeEnabled();
  });

  it("연말 주는 다음 해 1월 날짜를 비활성으로 이어 보여준다", () => {
    renderStrip({ selectedDate: "2026-12-31" });
    expect(
      screen.getByRole("button", { name: "1월 2일 토요일" }),
    ).toBeDisabled();
  });

  it("한 칸에 수입은 위(빨강), 지출은 아래(무채색)로 두고 이체·비지출 출금은 뺀다", () => {
    renderStrip();
    const day = screen.getByRole("button", { name: /^10월 4일/ });
    const income = within(day).getByText("+10만");
    const expense = within(day).getByText("-23만");
    expect(income).toHaveClass("text-red-600");
    expect(expense).toHaveClass("text-gray-600");
    expect(
      income.compareDocumentPosition(expense) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(day).queryByText(/999|888/)).toBeNull();
  });

  it.each([
    ["2026-10-11", "-999"],
    ["2026-10-12", "-1,000"],
    ["2026-10-13", "-9,999만"],
    ["2026-10-14", "-1억"],
    ["2026-10-15", "+1.1억"],
    ["2026-10-16", "-1만"],
    ["2026-10-17", "-2.8만"],
    ["2026-10-20", "-125만"],
  ])(
    "%s 금액은 %s로 쓴다 (1만 미만은 원 단위, 그 위는 만·억으로 내림)",
    (date, text) => {
      renderStrip({ selectedDate: date });
      const day = Number(date.slice(-2));
      expect(
        within(
          screen.getByRole("button", { name: new RegExp(`^10월 ${day}일`) }),
        ).getByText(text),
      ).toBeInTheDocument();
    },
  );

  it("접근성 이름에 날짜, 수입·지출, 선택 상태를 담는다", () => {
    renderStrip();
    expect(
      screen.getByRole("button", { name: /^10월 4일/ }),
    ).toHaveAccessibleName(
      "10월 4일 일요일, 수입 100,025원, 지출 231,700원, 선택됨",
    );
    expect(
      screen.getByRole("button", { name: /^10월 5일/ }),
    ).toHaveAccessibleName("10월 5일 월요일");
  });

  it("선택한 날은 검은 원 위 흰 숫자, 오늘은 굵은 숫자와 aria-current로 표시한다", () => {
    renderStrip();
    const selected = screen.getByRole("button", { name: /^10월 4일/ });
    expect(within(selected).getByText("4")).toHaveClass(
      "bg-gray-900",
      "text-white",
    );
    const today = screen.getByRole("button", { name: /^10월 5일/ });
    expect(today).toHaveAttribute("aria-current", "date");
    expect(within(today).getByText("5")).toHaveClass("font-semibold");
    expect(within(today).getByText("5")).not.toHaveClass("bg-gray-900");
  });

  it("날짜를 누르면 YYYY-MM-DD로 알린다", () => {
    const { onSelect } = renderStrip();
    fireEvent.click(screen.getByRole("button", { name: /^10월 7일/ }));
    expect(onSelect).toHaveBeenCalledWith("2026-10-07");
  });

  it("펼침 토글은 로컬 상태로 월 전체를 열고 닫으며 펼침 상태를 알린다", () => {
    renderStrip();
    const toggle = screen.getByRole("button", { name: "월간 달력 펼치기" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);

    // 2026-10: 9/27~10/31 다섯 주 35칸 중 10월 31일만 누를 수 있다.
    expect(dayButtons()).toHaveLength(35);
    expect(
      dayButtons().filter((button) => !(button as HTMLButtonElement).disabled),
    ).toHaveLength(31);
    const collapse = screen.getByRole("button", { name: "주간 달력으로 접기" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(collapse);
    expect(dayButtons()).toHaveLength(7);
  });

  it("펼친 달력에서 날짜를 누르면 접히고 그 날짜를 알린다", () => {
    const { onSelect } = renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "월간 달력 펼치기" }));
    fireEvent.click(screen.getByRole("button", { name: /^10월 20일/ }));

    expect(onSelect).toHaveBeenCalledWith("2026-10-20");
    expect(dayButtons()).toHaveLength(7);
    expect(
      screen.getByRole("button", { name: "월간 달력 펼치기" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("펼친 달력 바깥의 흐린 가림막을 누르면 날짜를 바꾸지 않고 접힌다", () => {
    const { onSelect } = renderStrip();
    expect(
      screen.queryByRole("button", { name: "달력 닫기" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "월간 달력 펼치기" }));

    fireEvent.click(screen.getByRole("button", { name: "달력 닫기" }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(dayButtons()).toHaveLength(7);
    expect(
      screen.queryByRole("button", { name: "달력 닫기" }),
    ).not.toBeInTheDocument();
  });

  it("날짜와 토글 버튼은 44px 이상이다", () => {
    renderStrip();
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveClass("min-h-11");
    }
  });
});
