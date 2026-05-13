import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssetTypeCard } from "./AssetTypeCard";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AssetTypeCard", () => {
  it("금융 계좌가 있으면 계좌 수와 관리 CTA를 표시한다", () => {
    render(
      <AssetTypeCard
        type="cash"
        holdingCount={1}
        countLabel="계좌"
        emptyText="아직 등록된 계좌가 없어요"
        activeActionText="관리하기"
        showValue={false}
      />,
    );

    expect(screen.getByText("금융 계좌")).toBeInTheDocument();
    expect(screen.getByText("1계좌")).toBeInTheDocument();
    expect(screen.getByText("관리하기")).toBeInTheDocument();
    expect(
      screen.queryByText("아직 등록된 계좌가 없어요"),
    ).not.toBeInTheDocument();
  });
});
