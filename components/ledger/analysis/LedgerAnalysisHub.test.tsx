import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLedgerBook } from "@/hooks/use-ledger-books";
import { LedgerAnalysisHub } from "./LedgerAnalysisHub";

const state = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/ledger/analysis",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(state.search),
}));
vi.mock("@/hooks/use-ledger-books", () => ({ useLedgerBook: vi.fn() }));
vi.mock("./LedgerAnalysisOverview", () => ({
  LedgerAnalysisOverview: (props: { bookName?: string; month: number }) => (
    <p>
      overview {props.month} {props.bookName ?? "all"}
    </p>
  ),
}));

const BOOK = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.mocked(useLedgerBook).mockReturnValue({
    data: { id: BOOK, name: "여행", visibility: "personal" },
  } as never);
});

describe("LedgerAnalysisHub", () => {
  it("links every analysis screen with the selected book and period", () => {
    state.search = `book=${BOOK}&year=2026&month=4`;

    render(<LedgerAnalysisHub />);

    expect(screen.getByText("overview 4 여행")).toBeInTheDocument();
    for (const [name, path] of [
      ["카테고리 분석", "by-category"],
      ["구성원별 지출", "by-member"],
      ["결제수단 분석", "by-payment-method"],
      ["월별 수입·지출", "trend"],
      ["일별 지출 현황", "daily"],
    ]) {
      expect(
        screen.getByRole("link", { name: new RegExp(name) }),
      ).toHaveAttribute(
        "href",
        `/ledger/analysis/${path}?book=${BOOK}&year=2026&month=4`,
      );
    }
  });
});
