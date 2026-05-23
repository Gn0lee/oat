import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TotalAssetCard } from "./TotalAssetCard";

describe("TotalAssetCard", () => {
  it("투자원금과 보유 종목 수를 표시하고 자산 페이지로 연결한다", () => {
    render(<TotalAssetCard totalInvested={20_000_000} holdingCount={4} />);

    expect(screen.getByText("투자원금")).toBeInTheDocument();
    expect(screen.getByText("₩20,000,000")).toBeInTheDocument();
    expect(screen.getByText("보유 종목")).toBeInTheDocument();
    expect(screen.getByText("4종목")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "자산 보기" })).toHaveAttribute(
      "href",
      "/assets",
    );
    expect(screen.queryByText("지금 우리집 자산은")).not.toBeInTheDocument();
    expect(screen.queryByText("₩125,430,000")).not.toBeInTheDocument();
    expect(screen.queryByText(/현재 평가금액/)).not.toBeInTheDocument();
    expect(screen.queryByText(/수익률/)).not.toBeInTheDocument();
  });
});
