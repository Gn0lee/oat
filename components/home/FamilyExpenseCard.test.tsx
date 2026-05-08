import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FamilyExpenseCard } from "./FamilyExpenseCard";

describe("FamilyExpenseCard", () => {
  it("공용 지출과 개인 지출 합산을 표시한다", () => {
    render(
      <FamilyExpenseCard
        sharedExpense={2_800_000}
        personalExpense={1_160_000}
      />,
    );

    expect(screen.getByText("가족 지출")).toBeInTheDocument();
    expect(screen.getByText("공용")).toBeInTheDocument();
    expect(screen.getByText("₩2,800,000")).toBeInTheDocument();
    expect(screen.getByText("개인 합산")).toBeInTheDocument();
    expect(screen.getByText("₩1,160,000")).toBeInTheDocument();
  });

  it("개인 지출 설명 문구를 표시한다", () => {
    render(<FamilyExpenseCard sharedExpense={0} personalExpense={50_000} />);

    expect(
      screen.getByText("개인 지출은 세부 내역 없이 합계만 함께 봐요"),
    ).toBeInTheDocument();
  });
});
