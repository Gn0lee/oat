import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CashFlowCard } from "./CashFlowCard";

describe("CashFlowCard", () => {
  it("수입과 지출이 0이면 empty state 텍스트를 표시한다", () => {
    render(
      <CashFlowCard
        totalIncome={0}
        totalExpense={0}
        balance={0}
        savingsRate={0}
        month={4}
      />,
    );
    expect(
      screen.getByText("가계부를 기록하면 현금 흐름이 표시돼요"),
    ).toBeInTheDocument();
  });

  it("수입과 지출 금액을 올바르게 표시한다", () => {
    render(
      <CashFlowCard
        totalIncome={5_000_000}
        totalExpense={3_800_000}
        balance={1_200_000}
        savingsRate={24}
        month={4}
      />,
    );
    expect(screen.getByText("₩5,000,000")).toBeInTheDocument();
    expect(screen.getByText("₩3,800,000")).toBeInTheDocument();
  });

  it('"남은 금액" 레이블을 표시한다', () => {
    render(
      <CashFlowCard
        totalIncome={5_000_000}
        totalExpense={3_800_000}
        balance={1_200_000}
        savingsRate={24}
        month={4}
      />,
    );
    expect(screen.getByText("남은 금액")).toBeInTheDocument();
  });

  it("balance가 음수이면 금액 텍스트에 red-500 클래스를 적용한다", () => {
    render(
      <CashFlowCard
        totalIncome={1_000_000}
        totalExpense={1_500_000}
        balance={-500_000}
        savingsRate={-50}
        month={4}
      />,
    );
    const balanceEl = screen.getByText("-₩500,000");
    expect(balanceEl).toHaveClass("text-red-500");
  });

  it("savingsRate 값이 화면에 표시된다", () => {
    render(
      <CashFlowCard
        totalIncome={5_000_000}
        totalExpense={3_800_000}
        balance={1_200_000}
        savingsRate={24}
        month={4}
      />,
    );
    expect(screen.getByText("저축률 24.0%")).toBeInTheDocument();
  });
});
