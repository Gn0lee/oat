import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StockSettingWithDetails } from "@/lib/api/stock-settings";
import { StockSettingsTable } from "./StockSettingsTable";

vi.mock("./StockSettingEditDialog", () => ({
  StockSettingEditDialog: () => null,
}));

const settings: StockSettingWithDetails[] = [
  {
    id: "setting-1",
    ticker: "005930",
    name: "삼성전자",
    market: "KR",
    assetType: "equity",
    riskLevel: "moderate",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  },
];

describe("StockSettingsTable", () => {
  it("renders stock settings as compact grouped rows", () => {
    render(<StockSettingsTable data={settings} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("삼성전자")).toBeInTheDocument();
    expect(screen.getByText("005930")).toBeInTheDocument();
    expect(screen.getByText("국내")).toBeInTheDocument();
    expect(screen.getByText("중립")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "수정" })).toBeInTheDocument();
  });

  it("shows an empty collection state", () => {
    render(<StockSettingsTable data={[]} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByTestId("screen-state")).toBeInTheDocument();
    expect(screen.getByText("등록된 종목이 없습니다.")).toBeInTheDocument();
  });
});
