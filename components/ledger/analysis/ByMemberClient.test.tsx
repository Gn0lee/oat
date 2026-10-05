import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLedgerStatsByMember } from "@/hooks/use-ledger-stats";
import { ByMemberClient } from "./ByMemberClient";

const url = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/ledger/analysis/by-member",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(url.search),
}));
vi.mock("@/hooks/use-ledger-stats", () => ({
  useLedgerStatsByMember: vi.fn(),
}));
vi.mock("./MonthSelector", () => ({ MonthSelector: () => null }));
vi.mock("@/components/ui/chart", () => ({
  ChartContainer: () => null,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

const me = {
  memberId: "me",
  memberName: "나",
  isCurrentUser: true,
  sharedExpense: 10_000,
  sharedIncome: 0,
  personalExpense: 7_000,
  personalExpenseVisible: true,
};
const partner = {
  memberId: "partner",
  memberName: "짝꿍",
  isCurrentUser: false,
  sharedExpense: 30_000,
  sharedIncome: 0,
  personalExpense: null,
  personalExpenseVisible: false,
};

function mockMembers(data: unknown) {
  vi.mocked(useLedgerStatsByMember).mockReturnValue({
    data,
    isLoading: false,
  } as never);
}

beforeEach(() => {
  url.search = "year=2026&month=10";
});

describe("ByMemberClient", () => {
  it("shows my personal spending and marks other members' personal spending as private, not 0", () => {
    mockMembers({ bookId: null, bookVisibility: null, members: [me, partner] });

    render(<ByMemberClient />);

    const mine = screen.getByRole("listitem", { name: "나" });
    expect(within(mine).getByText("7,000원")).toBeInTheDocument();
    const theirs = screen.getByRole("listitem", { name: "짝꿍" });
    expect(within(theirs).getByText("비공개")).toBeInTheDocument();
    expect(within(theirs).queryByText("0원")).toBeNull();
  });

  it("shows a single creator row with personal spending for a personal book", () => {
    const book = "00000000-0000-4000-8000-000000000003";
    url.search = `book=${book}&year=2026&month=10`;
    mockMembers({
      bookId: book,
      bookVisibility: "personal",
      members: [{ ...me, sharedExpense: 0 }],
    });

    render(<ByMemberClient />);

    expect(useLedgerStatsByMember).toHaveBeenCalledWith({
      year: 2026,
      month: 10,
      bookId: book,
    });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("개인 지출")).toBeInTheDocument();
    expect(screen.getByText("7,000원")).toBeInTheDocument();
    expect(screen.queryByText(/공용 지출/)).toBeNull();
  });

  it("omits the personal row inside a shared book", () => {
    mockMembers({
      bookId: "b",
      bookVisibility: "shared",
      members: [
        { ...me, personalExpense: null, personalExpenseVisible: false },
        partner,
      ],
    });

    render(<ByMemberClient />);

    expect(screen.queryByText("비공개")).toBeNull();
    expect(screen.queryByText("개인 지출")).toBeNull();
  });
});
