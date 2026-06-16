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
  it("renders holdings as collection cards instead of a table", () => {
    render(<HoldingsTable data={holdings} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("삼성전자")).toBeInTheDocument();
    expect(screen.getByText("005930")).toBeInTheDocument();
    expect(screen.getByText("10주")).toBeInTheDocument();
    expect(screen.getByText("ISA")).toBeInTheDocument();
    expect(screen.getByText("70만원")).toBeInTheDocument();
  });

  it("shows an empty collection state", () => {
    render(<HoldingsTable data={[]} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("보유 종목이 없습니다.")).toBeInTheDocument();
  });
});
