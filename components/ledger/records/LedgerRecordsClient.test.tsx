import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLedgerBook, useLedgerBooks } from "@/hooks/use-ledger-books";
import { useLedgerEntries } from "@/hooks/use-ledger-entries";
import { ApiQueryError } from "@/lib/api/client";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { LedgerRecordsClient } from "./LedgerRecordsClient";

const replace = vi.fn();
const state = vi.hoisted(() => ({ search: "date=2026-06-16" }));
const ledgerIdentity = vi.hoisted(() => ({
  userId: "user" as string | null,
  householdId: "household" as string | null,
  role: "member" as const,
}));
const push = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/ledger/records",
  useRouter: () => ({ replace, push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(state.search),
}));
vi.mock("@/hooks/use-ledger-entries", () => ({ useLedgerEntries: vi.fn() }));
vi.mock("@/hooks/use-ledger-books", () => ({
  useLedgerBooks: vi.fn(),
  useLedgerBook: vi.fn(),
}));
vi.mock("@/hooks/use-ledger-identity", () => ({
  useLedgerIdentity: () => ledgerIdentity,
}));
vi.mock("./LedgerDateStrip", () => ({
  LedgerDateStrip: ({
    onSelect,
    onViewChange,
    view,
  }: {
    onSelect: (date: string) => void;
    onViewChange: (view: "week" | "month") => void;
    view: "week" | "month";
  }) => (
    <div data-testid="date-strip" data-view={view}>
      <button type="button" onClick={() => onSelect("2026-06-17")}>
        다음 날짜 선택
      </button>
      <button
        type="button"
        onClick={() => onViewChange(view === "week" ? "month" : "week")}
      >
        보기 전환
      </button>
    </div>
  ),
}));
const book = {
  id: "book-1",
  name: "여행비",
  visibility: "shared" as const,
  createdBy: "user",
  isDefault: false,
  archivedAt: null,
  createdAt: "",
  updatedAt: "",
};
const entry = {
  id: "entry-1",
  householdId: "household",
  ownerId: "user",
  ownerName: "홍길동",
  type: "expense",
  amount: 1250000,
  title: "여행 기록",
  categoryId: null,
  categoryName: null,
  categoryIcon: null,
  fromAccountId: null,
  fromAccountName: null,
  fromPaymentMethodId: null,
  fromPaymentMethodName: null,
  toAccountId: null,
  toAccountName: null,
  toPaymentMethodId: null,
  toPaymentMethodName: null,
  isShared: true,
  memo: null,
  transactedAt: "2026-06-16T00:00:00Z",
  createdAt: "",
  updatedAt: "",
} satisfies LedgerEntryWithDetails;
function renderRecords() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <LedgerRecordsClient initialDate="2026-06-16" />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  state.search = "date=2026-06-16";
  ledgerIdentity.userId = "user";
  ledgerIdentity.householdId = "household";
  vi.mocked(useLedgerBooks).mockReturnValue({
    data: [book],
    isPending: false,
  } as never);
  vi.mocked(useLedgerBook).mockReturnValue({
    data: undefined,
    isPending: false,
  } as never);
  vi.mocked(useLedgerEntries).mockImplementation(
    (params) =>
      ({ data: params?.month === 6 ? [entry] : [], isLoading: false }) as never,
  );
});
const earlierEntry = {
  ...entry,
  id: "entry-0",
  title: "지난 기록",
  type: "income",
  amount: 30000,
  transactedAt: "2026-06-14T00:00:00Z",
} satisfies LedgerEntryWithDetails;
const laterEntry = {
  ...entry,
  id: "entry-2",
  title: "나중 기록",
  transactedAt: "2026-06-20T00:00:00Z",
} satisfies LedgerEntryWithDetails;

describe("LedgerRecordsClient", () => {
  it("whole scope displays visible entries and preserves date/category conditions in detail return", () => {
    state.search = "date=2026-06-16&categoryId=category-1";
    renderRecords();
    expect(screen.getByRole("link", { name: /여행 기록/ })).toHaveAttribute(
      "href",
      "/ledger/records/entry-1?from=records&date=2026-06-16&returnTo=%2Fledger%2Frecords%3Fdate%3D2026-06-16%26categoryId%3Dcategory-1",
    );
    expect(screen.getByRole("link", { name: "장부 관리" })).toHaveAttribute(
      "href",
      "/ledger/books?returnTo=%2Fledger%2Frecords%3Fdate%3D2026-06-16%26categoryId%3Dcategory-1",
    );
    expect(useLedgerEntries).toHaveBeenCalledWith(
      expect.objectContaining({ bookId: undefined, categoryId: "category-1" }),
    );
  });

  it("only queries the selected month", () => {
    renderRecords();
    expect(useLedgerEntries).toHaveBeenCalledTimes(1);
    expect(useLedgerEntries).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2026, month: 6 }),
    );
  });

  it("shows month expense and income as the summary without a balance", () => {
    vi.mocked(useLedgerEntries).mockReturnValue({
      data: [entry, earlierEntry],
      isLoading: false,
    } as never);
    renderRecords();
    expect(screen.getByText("지출").nextSibling).toHaveTextContent(
      "-1,250,000원",
    );
    expect(screen.getByText("수입").nextSibling).toHaveTextContent("+30,000원");
    expect(screen.queryByText("잔액")).not.toBeInTheDocument();
  });

  it("lists the selected day then earlier days of the month, newest first", () => {
    vi.mocked(useLedgerEntries).mockReturnValue({
      data: [laterEntry, entry, earlierEntry],
      isLoading: false,
    } as never);
    renderRecords();
    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual(["16일 화요일", "14일 일요일"]);
    expect(screen.queryByText("나중 기록")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /지난 기록/ })).toBeInTheDocument();
  });

  it("keeps the selected day heading with an empty line when it has no records", () => {
    vi.mocked(useLedgerEntries).mockReturnValue({
      data: [earlierEntry],
      isLoading: false,
    } as never);
    renderRecords();
    expect(
      screen.getByRole("heading", { level: 3, name: "16일 화요일" }),
    ).toBeInTheDocument();
    expect(screen.getByText("기록이 없어요")).toBeInTheDocument();
  });

  it("whole scope rows show the book name", () => {
    vi.mocked(useLedgerEntries).mockReturnValue({
      data: [
        {
          ...entry,
          book: { name: "여행비", visibility: "shared", archivedAt: null },
        },
      ],
      isLoading: false,
    } as never);
    renderRecords();
    expect(screen.getByRole("link", { name: /여행 기록/ })).toHaveTextContent(
      "여행비",
    );
  });

  it("links to search and analysis with only the book", () => {
    state.search = "book=book-1&date=2026-06-16&view=month";
    vi.mocked(useLedgerBook).mockReturnValue({
      data: book,
      isPending: false,
    } as never);
    renderRecords();
    expect(screen.getByRole("link", { name: "내역 검색" })).toHaveAttribute(
      "href",
      "/ledger/search?book=book-1",
    );
    expect(screen.getByRole("link", { name: /분석 보기/ })).toHaveAttribute(
      "href",
      "/ledger/analysis?book=book-1",
    );
  });

  it("selecting a book chip keeps the screen, drops the date and keeps the view", async () => {
    state.search = "date=2026-06-16&view=month";
    renderRecords();
    await userEvent.click(screen.getByRole("button", { name: "여행비" }));
    expect(push).toHaveBeenCalledWith("/ledger/records?view=month&book=book-1");
  });

  it("selecting 전체 from a book removes the book and date", async () => {
    state.search = "book=book-1&date=2026-06-16&view=month";
    vi.mocked(useLedgerBook).mockReturnValue({
      data: book,
      isPending: false,
    } as never);
    renderRecords();
    await userEvent.click(screen.getByRole("button", { name: "전체" }));
    expect(push).toHaveBeenCalledWith("/ledger/records?view=month");
  });

  it("re-selecting the current book chip does not push a duplicate history entry", async () => {
    state.search = "date=2026-06-16";
    renderRecords();
    await userEvent.click(screen.getByRole("button", { name: "전체" }));
    expect(push).not.toHaveBeenCalled();
  });

  it("month arrows move to the last day of that month (today in the current month)", async () => {
    renderRecords();
    await userEvent.click(screen.getByRole("button", { name: "이전 달" }));
    expect(replace).toHaveBeenLastCalledWith("/ledger/records?date=2026-05-31");
    await userEvent.click(screen.getByRole("button", { name: "다음 달" }));
    expect(replace).toHaveBeenLastCalledWith("/ledger/records?date=2026-07-31");
    await userEvent.click(
      screen.getByRole("button", { name: "5월 기록 보기" }),
    );
    expect(replace).toHaveBeenLastCalledWith("/ledger/records?date=2026-05-31");
  });

  it("week is the default view and expanding stores view=month in the URL", async () => {
    renderRecords();
    expect(screen.getByTestId("date-strip")).toHaveAttribute(
      "data-view",
      "week",
    );
    await userEvent.click(screen.getByRole("button", { name: "보기 전환" }));
    expect(replace).toHaveBeenLastCalledWith(
      "/ledger/records?date=2026-06-16&view=month",
    );
  });

  it("restores month view from the URL and collapsing removes it", async () => {
    state.search = "date=2026-06-16&view=month";
    renderRecords();
    expect(screen.getByTestId("date-strip")).toHaveAttribute(
      "data-view",
      "month",
    );
    await userEvent.click(screen.getByRole("button", { name: "보기 전환" }));
    expect(replace).toHaveBeenLastCalledWith("/ledger/records?date=2026-06-16");
  });

  it("specific active non-default book exposes creation scoped to that book", () => {
    state.search = "book=book-1&date=2026-06-16";
    vi.mocked(useLedgerBook).mockReturnValue({
      data: book,
      isPending: false,
    } as never);
    renderRecords();
    expect(useLedgerEntries).toHaveBeenCalledWith(
      expect.objectContaining({ bookId: "book-1", enabled: true }),
    );
    expect(
      screen.getByRole("link", { name: "여행비 장부 관리" }),
    ).toHaveAttribute(
      "href",
      "/ledger/books/book-1?returnTo=%2Fledger%2Frecords%3Fbook%3Dbook-1%26date%3D2026-06-16",
    );
    expect(screen.getByRole("link", { name: /기록 추가/ })).toHaveAttribute(
      "href",
      "/ledger/records/new/daily?date=2026-06-16&book=book-1",
    );
    expect(screen.getByRole("button", { name: "여행비" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("archived book retains its scope, shows read-only and has no creation link", () => {
    state.search = "book=book-1&date=2026-06-16";
    vi.mocked(useLedgerBook).mockReturnValue({
      data: { ...book, archivedAt: "2026-06-01Z" },
      isPending: false,
    } as never);
    renderRecords();
    expect(screen.getByRole("status")).toHaveTextContent("읽기 전용");
    expect(
      screen.queryByRole("link", { name: /기록 추가/ }),
    ).not.toBeInTheDocument();
  });

  it("hidden book does not fall back to totals or reveal entries", () => {
    state.search = "book=hidden";
    vi.mocked(useLedgerBook).mockReturnValue({
      data: undefined,
      error: new ApiQueryError("BOOK_UNAVAILABLE", "hidden", 404),
      isPending: false,
    } as never);
    renderRecords();
    expect(screen.getByText("장부를 볼 수 없음")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "전체 장부로 이동" }),
    ).toHaveAttribute("href", "/ledger/records");
    expect(screen.queryByText("여행 기록")).not.toBeInTheDocument();
    expect(useLedgerEntries).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it("date change preserves book, view and filters in URL", async () => {
    state.search = "book=book-1&date=2026-06-16&categoryId=category-1";
    vi.mocked(useLedgerBook).mockReturnValue({
      data: book,
      isPending: false,
    } as never);
    renderRecords();
    await userEvent.click(
      screen.getByRole("button", { name: "다음 날짜 선택" }),
    );
    expect(replace).toHaveBeenCalledWith(
      "/ledger/records?book=book-1&date=2026-06-17&categoryId=category-1",
    );
  });

  it("falls back to the validated initial date for malformed date query values", () => {
    state.search = "date=2026-02-31";
    renderRecords();

    expect(
      screen.getByRole("heading", { level: 3, name: "16일 화요일" }),
    ).toBeInTheDocument();
    expect(useLedgerEntries).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2026, month: 6 }),
    );
  });

  it("shows household setup guidance and disables record queries without a household", () => {
    ledgerIdentity.householdId = null;
    state.search = "book=book-1";
    vi.mocked(useLedgerBook).mockReturnValue({
      data: undefined,
      isPending: true,
    } as never);
    vi.mocked(useLedgerBooks).mockReturnValue({
      data: undefined,
      isPending: true,
    } as never);

    renderRecords();

    expect(screen.getByText("가구 설정이 필요해요")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "가구 설정으로 이동" }),
    ).toHaveAttribute("href", "/settings/household");
    expect(
      vi
        .mocked(useLedgerEntries)
        .mock.calls.every(([params]) => params?.enabled === false),
    ).toBe(true);
  });

  it("applies the analysis view-all conditions and shows them with a way to clear", async () => {
    state.search =
      "date=2026-06-16&type=expense&paymentMethodId=__none__&categoryId=__none__";
    renderRecords();

    expect(useLedgerEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "expense",
        paymentMethodId: "__none__",
        categoryId: "__none__",
      }),
    );
    expect(
      screen.getByText("지출 · 미분류 · 결제수단 없음"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "조건 해제" }));

    expect(replace).toHaveBeenCalledWith("/ledger/records?date=2026-06-16");
  });

  it("names the payment method of a filtered list from its records", () => {
    state.search = "date=2026-06-16&paymentMethodId=card-1";
    vi.mocked(useLedgerEntries).mockReturnValue({
      data: [
        {
          ...entry,
          fromPaymentMethodId: "card-1",
          fromPaymentMethodName: "생활 카드",
        },
      ],
      isLoading: false,
    } as never);
    renderRecords();

    expect(screen.getByText("생활 카드")).toBeInTheDocument();
  });

  it("shows no condition bar without analysis conditions", () => {
    renderRecords();

    expect(screen.queryByRole("button", { name: "조건 해제" })).toBeNull();
  });
});
