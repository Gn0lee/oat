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
      screen.getByText(
        "첫 지출이나 수입을 기록하면 이번 달 흐름을 볼 수 있어요.",
      ),
    ).toBeInTheDocument();
  });

  it("내 기록이 한 번도 없으면 empty state 문장 끝에 기록 링크를 표시한다", () => {
    render(
      <CashFlowCard
        totalIncome={0}
        totalExpense={0}
        balance={0}
        savingsRate={0}
        month={4}
        hasRecentOwnLedgerActivity={false}
        lastOwnLedgerEntryCreatedAt={null}
      />,
    );

    expect(
      screen.getByText(
        "첫 지출이나 수입을 기록하면 이번 달 흐름을 볼 수 있어요.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "기록해보세요" })).toHaveAttribute(
      "href",
      "/ledger/records/new/full",
    );
  });

  it("잔액이 양수이면 부드러운 대표 문장을 표시한다", () => {
    render(
      <CashFlowCard
        totalIncome={5_000_000}
        totalExpense={3_800_000}
        balance={1_200_000}
        savingsRate={24}
        month={4}
      />,
    );
    expect(
      screen.getByText("이번 달은 아직 ₩1,200,000 남았어요"),
    ).toBeInTheDocument();
  });

  it("잔액이 음수이면 초과 지출 문장을 표시한다", () => {
    render(
      <CashFlowCard
        totalIncome={1_000_000}
        totalExpense={1_500_000}
        balance={-500_000}
        savingsRate={-50}
        month={4}
      />,
    );
    expect(
      screen.getByText("이번 달은 ₩500,000 초과 지출 중이에요"),
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
    expect(
      screen.getByText("저축률 24%로 흘러가고 있어요"),
    ).toBeInTheDocument();
  });

  it("최근 7일 내 내 기록이 없으면 카드 하단 안내 문장 끝에 기록 링크를 표시한다", () => {
    render(
      <CashFlowCard
        totalIncome={5_000_000}
        totalExpense={3_800_000}
        balance={1_200_000}
        savingsRate={24}
        month={4}
        hasRecentOwnLedgerActivity={false}
        lastOwnLedgerEntryCreatedAt="2026-05-01T00:00:00.000Z"
      />,
    );

    expect(screen.getByText(/최근 기록이 뜸해요/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "기록해보세요" })).toHaveAttribute(
      "href",
      "/ledger/records/new/full",
    );
  });

  it("최근 7일 내 내 기록이 있으면 기록 유도 문장을 표시하지 않는다", () => {
    render(
      <CashFlowCard
        totalIncome={5_000_000}
        totalExpense={3_800_000}
        balance={1_200_000}
        savingsRate={24}
        month={4}
        hasRecentOwnLedgerActivity={true}
        lastOwnLedgerEntryCreatedAt="2026-05-10T00:00:00.000Z"
      />,
    );

    expect(screen.queryByText(/최근 기록이 뜸해요/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "기록해보세요" }),
    ).not.toBeInTheDocument();
  });

  it("이번 달 수입과 지출이 0이어도 최근 내 기록이 있으면 기록 링크를 표시하지 않는다", () => {
    render(
      <CashFlowCard
        totalIncome={0}
        totalExpense={0}
        balance={0}
        savingsRate={0}
        month={4}
        hasRecentOwnLedgerActivity={true}
        lastOwnLedgerEntryCreatedAt="2026-05-10T00:00:00.000Z"
      />,
    );

    expect(
      screen.queryByRole("link", { name: "기록해보세요" }),
    ).not.toBeInTheDocument();
  });
});
