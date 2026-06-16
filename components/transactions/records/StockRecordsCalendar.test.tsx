import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StockRecordsCalendar } from "./StockRecordsCalendar";

describe("StockRecordsCalendar", () => {
  it("이전달/다음달 outside day를 현재 달보다 옅게 렌더링한다", () => {
    const { container } = render(
      <StockRecordsCalendar
        currentMonth={new Date("2026-06-01T00:00:00.000Z")}
        onMonthChange={vi.fn()}
        selectedDate={new Date("2026-06-10T00:00:00.000Z")}
        onDateSelect={vi.fn()}
        summariesByDate={new Map()}
        onRefresh={vi.fn()}
      />,
    );

    const outsideDayNumber = container.querySelector("span.text-gray-300");

    expect(outsideDayNumber).not.toBeNull();
    expect(outsideDayNumber).toHaveClass("text-gray-300");
  });
});
