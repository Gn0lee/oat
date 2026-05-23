import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useHoldings } from "@/hooks/use-holdings";
import { HoldingsList } from "./HoldingsList";

vi.mock("@/hooks/use-holdings", () => ({
  useHoldings: vi.fn(),
}));

vi.mock("./HoldingsFilters", () => ({
  HoldingsFilters: () => <div>filters</div>,
}));

vi.mock("./HoldingsTable", () => ({
  HoldingsTable: ({
    data,
  }: {
    data: Array<{ ticker: string; name: string }>;
  }) => (
    <div>
      {data.map((item) => (
        <div key={item.ticker}>
          <span>{item.name}</span>
          <span>{item.ticker}</span>
        </div>
      ))}
    </div>
  ),
}));

describe("HoldingsList", () => {
  const members = [{ id: "user-1", name: "지호" }];
  const accounts = [{ id: "account-1", name: "삼성증권" }];

  it("first load shows skeleton", () => {
    vi.mocked(useHoldings).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: null,
    } as ReturnType<typeof useHoldings>);

    const { container } = render(
      <HoldingsList members={members} accounts={accounts} />,
    );

    expect(
      container.querySelectorAll("[data-slot='skeleton']").length,
    ).toBeGreaterThan(0);
  });

  it("error state is shown when query fails", () => {
    vi.mocked(useHoldings).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error("failed"),
    } as ReturnType<typeof useHoldings>);

    render(<HoldingsList members={members} accounts={accounts} />);

    expect(
      screen.getByText("보유 현황을 불러오지 못했습니다."),
    ).toBeInTheDocument();
  });

  it("renders holding rows from query data", () => {
    vi.mocked(useHoldings).mockReturnValue({
      data: {
        data: [
          {
            ticker: "005930",
            name: "삼성전자",
            quantity: 10,
            avgPrice: 70000,
            totalInvested: 700000,
            market: "KR",
            currency: "KRW",
            assetType: "equity",
            riskLevel: null,
            firstTransactionAt: null,
            lastTransactionAt: null,
            owner: { id: "user-1", name: "지호" },
            account: { id: "account-1", name: "삼성증권", broker: "samsung" },
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      },
      isLoading: false,
      isFetching: false,
      error: null,
    } as ReturnType<typeof useHoldings>);

    render(<HoldingsList members={members} accounts={accounts} />);

    expect(screen.getByText("총 1개 종목 보유 중")).toBeInTheDocument();
    expect(screen.getByText("삼성전자")).toBeInTheDocument();
    expect(screen.getByText("005930")).toBeInTheDocument();
  });
});
