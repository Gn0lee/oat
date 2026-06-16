import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HoldingWithDetails } from "@/lib/api/holdings";
import { HoldingsTable } from "./HoldingsTable";

const holdings: HoldingWithDetails[] = [
  {
    ticker: "005930",
    name: "삼성전자",
    quantity: 10,
    avgPrice: 70_000,
    totalInvested: 700_000,
    market: "KR",
    currency: "KRW",
    assetType: "equity",
    riskLevel: "moderate",
    firstTransactionAt: null,
    lastTransactionAt: null,
    owner: { id: "user-1", name: "진호" },
    account: { id: "account-1", name: "ISA", broker: "NH" },
  },
];

describe("HoldingsTable", () => {
  it("renders holdings as one grouped list, not a card grid", () => {
    const { container } = render(<HoldingsTable data={holdings} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("삼성전자")).toBeInTheDocument();
    expect(screen.getByText("005930")).toBeInTheDocument();
    expect(screen.getByText("10주")).toBeInTheDocument();
    expect(screen.getByText("ISA")).toBeInTheDocument();
    expect(screen.getByText("70만원")).toBeInTheDocument();

    // Assert sort controls exist
    expect(screen.getByText("투자금")).toBeInTheDocument();
    expect(screen.getByText("수량")).toBeInTheDocument();
    expect(screen.getByText("종목명")).toBeInTheDocument();

    // Assert no desktop grid-cols-2 card-grid class
    expect(
      container.querySelector(".lg\\:grid-cols-2"),
    ).not.toBeInTheDocument();
  });

  it("shows an empty collection state", () => {
    render(<HoldingsTable data={[]} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByTestId("screen-state")).toBeInTheDocument();
    expect(screen.getByText("보유 종목이 없습니다.")).toBeInTheDocument();
  });
});
