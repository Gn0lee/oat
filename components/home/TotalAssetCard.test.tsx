import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TotalAssetCard } from "./TotalAssetCard";

describe("TotalAssetCard", () => {
  it("총 자산과 투자 요약을 표시하고 자산 페이지로 연결한다", () => {
    render(
      <TotalAssetCard
        totalValue={125_430_000}
        holdingCount={12}
        totalInvested={90_000_000}
        returnRate={8.4}
      />,
    );

    expect(screen.getByText("지금 우리집 자산은")).toBeInTheDocument();
    expect(screen.getByText("₩125,430,000")).toBeInTheDocument();
    expect(screen.getByText("12종목")).toBeInTheDocument();
    expect(screen.getByText("투자원금 ₩90,000,000")).toBeInTheDocument();
    expect(screen.getByText("수익률 +8.40%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "자산 보기" })).toHaveAttribute(
      "href",
      "/assets",
    );
  });
});
