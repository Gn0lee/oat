import { render, screen } from "@testing-library/react";
import { Wallet } from "lucide-react";
import { describe, expect, it } from "vitest";
import { FeatureCard } from "./FeatureCard";

describe("FeatureCard", () => {
  it("lucide 아이콘 컴포넌트를 렌더링한다", () => {
    render(
      <FeatureCard
        icon={Wallet}
        title="자산"
        description="투자 현황을 파악해요"
        hint="12종목"
        href="/assets"
        colorScheme="blue"
      />,
    );

    expect(screen.getByTestId("feature-card-icon")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /자산/ })).toHaveAttribute(
      "href",
      "/assets",
    );
  });
});
