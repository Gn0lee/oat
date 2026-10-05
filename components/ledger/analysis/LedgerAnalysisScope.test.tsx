import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLedgerBook, useLedgerBooks } from "@/hooks/use-ledger-books";
import { ApiQueryError } from "@/lib/api/client";
import { LedgerAnalysisScope } from "./LedgerAnalysisScope";

const push = vi.fn();
const state = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/ledger/analysis/by-category",
  useRouter: () => ({ push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(state.search),
}));
vi.mock("@/hooks/use-ledger-books", () => ({
  useLedgerBooks: vi.fn(),
  useLedgerBook: vi.fn(),
}));

const living = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "생활비",
  visibility: "shared" as const,
  createdBy: null,
  isDefault: true,
  archivedAt: null,
  createdAt: "",
  updatedAt: "",
};
const trip = {
  ...living,
  id: "00000000-0000-4000-8000-000000000002",
  name: "여행",
  isDefault: false,
  archivedAt: "2026-10-01T00:00:00.000Z",
};

function mockBooks(selected?: unknown, error?: unknown) {
  vi.mocked(useLedgerBooks).mockReturnValue({
    data: [living, trip],
    isPending: false,
    error: null,
  } as never);
  vi.mocked(useLedgerBook).mockReturnValue({
    data: selected,
    isPending: !selected && !error,
    error: error ?? null,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  state.search = "";
});

describe("LedgerAnalysisScope", () => {
  it("replaces the shared/personal tabs with a book selector that keeps the period and type", async () => {
    state.search = "year=2026&month=4&type=income&scope=personal";
    mockBooks();

    render(
      <LedgerAnalysisScope>
        <p>분석 본문</p>
      </LedgerAnalysisScope>,
    );

    expect(screen.queryByRole("button", { name: "공용 지출" })).toBeNull();
    expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("분석 본문")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /여행/ }));

    expect(push).toHaveBeenCalledWith(
      `/ledger/analysis/by-category?year=2026&month=4&type=income&book=${trip.id}`,
    );
  });

  it("shows the selected book's visibility and archived state", () => {
    state.search = `book=${trip.id}`;
    mockBooks(trip);

    render(
      <LedgerAnalysisScope>
        <p>분석 본문</p>
      </LedgerAnalysisScope>,
    );

    expect(screen.getByText("공용 장부 · 보관됨")).toBeInTheDocument();
    expect(screen.getByText("분석 본문")).toBeInTheDocument();
  });

  it("shows the unavailable state without rendering any figures for a hidden book", () => {
    state.search =
      "book=00000000-0000-4000-8000-000000000009&year=2026&month=4";
    mockBooks(undefined, new ApiQueryError("BOOK_UNAVAILABLE", "x", 404));

    render(
      <LedgerAnalysisScope>
        <p>분석 본문</p>
      </LedgerAnalysisScope>,
    );

    expect(screen.getByText("장부를 볼 수 없음")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "전체 장부로 이동" }),
    ).toHaveAttribute("href", "/ledger/analysis/by-category?year=2026&month=4");
    expect(screen.queryByText("분석 본문")).toBeNull();
  });
});
