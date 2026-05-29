import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { PageTransition } from "./PageTransition";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/ledger"),
}));

describe("PageTransition", () => {
  it("현재 pathname을 SSGOI transition boundary id로 사용한다", () => {
    vi.mocked(usePathname).mockReturnValue("/ledger");

    render(
      <PageTransition>
        <div>가계부</div>
      </PageTransition>,
    );

    expect(screen.getByText("가계부").parentElement).toHaveAttribute(
      "data-ssgoi-transition",
      "/ledger",
    );
  });

  it("pathname이 바뀌면 transition boundary DOM을 새로 만든다", () => {
    vi.mocked(usePathname).mockReturnValue("/ledger");
    const { rerender } = render(
      <PageTransition>
        <div>가계부</div>
      </PageTransition>,
    );
    const ledgerBoundary = screen.getByText("가계부").parentElement;

    vi.mocked(usePathname).mockReturnValue("/ledger/records/new/full");
    rerender(
      <PageTransition>
        <div>기록 추가</div>
      </PageTransition>,
    );

    const newBoundary = screen.getByText("기록 추가").parentElement;
    expect(newBoundary).toHaveAttribute(
      "data-ssgoi-transition",
      "/ledger/records/new/full",
    );
    expect(newBoundary).not.toBe(ledgerBoundary);
  });
});
