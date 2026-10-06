import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
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
const strip = vi.hoisted(() => ({ isReal: false }));
vi.mock("./LedgerDateStrip", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./LedgerDateStrip")>();
  return {
    LedgerDateStrip: (props: Parameters<typeof actual.LedgerDateStrip>[0]) =>
      strip.isReal ? (
        <actual.LedgerDateStrip {...props} />
      ) : (
        <FakeDateStrip {...props} />
      ),
  };
});
function FakeDateStrip({
  onSelect,
  ...props
}: {
  onSelect: (date: string) => void;
  selectedDate: string;
}) {
  return (
    <div
      data-testid="date-strip"
      data-selected={props.selectedDate}
      data-props={Object.keys(props).join(",")}
    >
      {["2026-06-14", "2026-06-17"].map((date) => (
        <button key={date} type="button" onClick={() => onSelect(date)}>
          {date} 선택
        </button>
      ))}
    </div>
  );
}
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
function renderRecords(initialDate = "2026-06-16") {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <div data-testid="scroller" style={{ overflowY: "scroll" }}>
        <LedgerRecordsClient initialDate={initialDate} />
      </div>
    </QueryClientProvider>,
  );
}
const scrollIntoView = vi.fn();
const scrollTo = vi.fn();
function scrolledSections() {
  return scrollIntoView.mock.contexts as HTMLElement[];
}
function dayHeadings() {
  return screen
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
}
// Headers are observed against the scroll container; the mock reports which
// headers sit above the line just below the sticky area.
const observers: {
  callback: IntersectionObserverCallback;
  targets: Element[];
  isDisconnected: boolean;
}[] = [];
class MockIntersectionObserver {
  private record: (typeof observers)[number];
  constructor(callback: IntersectionObserverCallback) {
    this.record = { callback, targets: [], isDisconnected: false };
    observers.push(this.record);
  }
  observe(target: Element) {
    this.record.targets.push(target);
  }
  unobserve() {}
  disconnect() {
    this.record.isDisconnected = true;
  }
  takeRecords() {
    return [];
  }
}
// Reports `date`'s header as the one caught just below the sticky area: it
// and every newer header sit above the line, older ones below it.
function reportTopHeader(date: string) {
  const observer = observers.findLast((item) => !item.isDisconnected);
  if (!observer) throw new Error("no active IntersectionObserver");
  const entries = observer.targets.map((target) => {
    const targetDate = target.closest("section")?.dataset.date ?? "";
    return {
      target,
      boundingClientRect: { top: targetDate >= date ? 90 : 300 },
      rootBounds: { top: 100 },
      isIntersecting: targetDate < date,
    } as unknown as IntersectionObserverEntry;
  });
  act(() => observer.callback(entries, {} as IntersectionObserver));
}
// No header has scrolled up to the line: the list is back at its top.
function reportNoHeaderCaught() {
  reportTopHeader("9999-12-31");
}
// The browser's first notification right after observing.
function reportInitialHeaders(date?: string) {
  if (date) reportTopHeader(date);
  else reportNoHeaderCaught();
}
function finishProgrammaticScroll() {
  fireEvent(screen.getByTestId("scroller"), new Event("scrollend"));
}
function section(name: string) {
  return screen.getByRole("heading", { level: 3, name }).closest("section");
}
beforeEach(() => {
  vi.clearAllMocks();
  observers.length = 0;
  strip.isReal = false;
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  Element.prototype.scrollIntoView = scrollIntoView;
  Element.prototype.scrollTo = scrollTo as never;
  vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
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
const previousWeekEntry = {
  ...entry,
  id: "entry-3",
  title: "지난주 기록",
  transactedAt: "2026-06-03T00:00:00Z",
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

  it("lists every day of the month with records as headers, newest first", () => {
    vi.mocked(useLedgerEntries).mockReturnValue({
      data: [laterEntry, entry, earlierEntry],
      isLoading: false,
    } as never);
    renderRecords();
    expect(dayHeadings()).toEqual([
      "20일 토요일",
      "16일 화요일",
      "14일 일요일",
    ]);
    expect(screen.getByRole("link", { name: /나중 기록/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /지난 기록/ })).toBeInTheDocument();
    expect(screen.queryByText("기록이 없어요")).not.toBeInTheDocument();
  });

  it("shows an empty-state guide for a month without records", () => {
    vi.mocked(useLedgerEntries).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    renderRecords();
    expect(screen.getByText("6월 기록이 없어요")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });

  it("entering with a date scrolls to that day's header", () => {
    vi.mocked(useLedgerEntries).mockReturnValue({
      data: [laterEntry, entry, earlierEntry],
      isLoading: false,
    } as never);
    renderRecords();
    expect(scrolledSections()).toEqual([section("16일 화요일")]);
    expect(screen.getByTestId("date-strip")).toHaveAttribute(
      "data-selected",
      "2026-06-16",
    );
  });

  it("entering without a date starts at the top and selects the newest day", () => {
    state.search = "";
    vi.mocked(useLedgerEntries).mockReturnValue({
      data: [laterEntry, entry, earlierEntry],
      isLoading: false,
    } as never);
    renderRecords();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getByTestId("date-strip")).toHaveAttribute(
      "data-selected",
      "2026-06-20",
    );
    expect(screen.getByRole("link", { name: "기록 추가" })).toHaveAttribute(
      "href",
      "/ledger/records/new/daily?date=2026-06-20",
    );
  });

  it("opens the month in the URL and selects its anchor day when it has no records", () => {
    state.search = "month=2026-05";
    vi.mocked(useLedgerEntries).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    renderRecords();
    expect(useLedgerEntries).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2026, month: 5 }),
    );
    expect(screen.getByText("5월 기록이 없어요")).toBeInTheDocument();
    expect(screen.getByTestId("date-strip")).toHaveAttribute(
      "data-selected",
      "2026-05-31",
    );
    expect(screen.getByRole("link", { name: "기록 추가" })).toHaveAttribute(
      "href",
      "/ledger/records/new/daily?date=2026-05-31",
    );
  });

  it("selects an entered date without records but adds no empty section", () => {
    state.search = "date=2026-06-17";
    vi.mocked(useLedgerEntries).mockReturnValue({
      data: [laterEntry, entry, earlierEntry],
      isLoading: false,
    } as never);
    renderRecords();
    expect(screen.getByTestId("date-strip")).toHaveAttribute(
      "data-selected",
      "2026-06-17",
    );
    expect(dayHeadings()).toEqual([
      "20일 토요일",
      "16일 화요일",
      "14일 일요일",
    ]);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("tapping a date scrolls to its header and updates the date without navigating", async () => {
    vi.mocked(useLedgerEntries).mockReturnValue({
      data: [laterEntry, entry, earlierEntry],
      isLoading: false,
    } as never);
    renderRecords();
    scrollIntoView.mockClear();

    await userEvent.click(
      screen.getByRole("button", { name: "2026-06-14 선택" }),
    );

    expect(scrolledSections()).toEqual([section("14일 일요일")]);
    expect(window.history.replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/ledger/records?date=2026-06-14",
    );
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId("date-strip")).toHaveAttribute(
      "data-selected",
      "2026-06-14",
    );
    expect(screen.getByRole("link", { name: "기록 추가" })).toHaveAttribute(
      "href",
      "/ledger/records/new/daily?date=2026-06-14",
    );
  });

  it("tapping a day without records inserts a temporary empty section in place until another day is tapped", async () => {
    vi.mocked(useLedgerEntries).mockReturnValue({
      data: [laterEntry, entry, earlierEntry],
      isLoading: false,
    } as never);
    renderRecords();
    scrollIntoView.mockClear();

    await userEvent.click(
      screen.getByRole("button", { name: "2026-06-17 선택" }),
    );

    expect(dayHeadings()).toEqual([
      "20일 토요일",
      "17일 수요일",
      "16일 화요일",
      "14일 일요일",
    ]);
    expect(section("17일 수요일")).toHaveTextContent("기록이 없어요");
    expect(scrolledSections()).toEqual([section("17일 수요일")]);

    await userEvent.click(
      screen.getByRole("button", { name: "2026-06-14 선택" }),
    );

    expect(dayHeadings()).toEqual([
      "20일 토요일",
      "16일 화요일",
      "14일 일요일",
    ]);
    expect(screen.queryByText("기록이 없어요")).not.toBeInTheDocument();
  });

  it("tapping a day in an empty month shows only that day's empty section", async () => {
    vi.mocked(useLedgerEntries).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    renderRecords();
    await userEvent.click(
      screen.getByRole("button", { name: "2026-06-17 선택" }),
    );
    expect(dayHeadings()).toEqual(["17일 수요일"]);
    expect(screen.queryByText("6월 기록이 없어요")).not.toBeInTheDocument();
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

  it("selecting a book chip keeps the screen and drops the date and month", async () => {
    state.search = "date=2026-06-16&month=2026-06&view=month";
    renderRecords();
    await userEvent.click(screen.getByRole("button", { name: "여행비" }));
    expect(push).toHaveBeenCalledWith("/ledger/records?book=book-1");
  });

  it("selecting 전체 from a book removes the book and date", async () => {
    state.search = "book=book-1&date=2026-06-16&view=month";
    vi.mocked(useLedgerBook).mockReturnValue({
      data: book,
      isPending: false,
    } as never);
    renderRecords();
    await userEvent.click(screen.getByRole("button", { name: "전체" }));
    expect(push).toHaveBeenCalledWith("/ledger/records");
  });

  it("re-selecting the current book chip does not push a duplicate history entry", async () => {
    state.search = "date=2026-06-16";
    renderRecords();
    await userEvent.click(screen.getByRole("button", { name: "전체" }));
    expect(push).not.toHaveBeenCalled();
  });

  it("month arrows replace the URL with that month, drop the date and scroll to the top", async () => {
    state.search = "book=book-1&date=2026-06-16&type=expense";
    vi.mocked(useLedgerBook).mockReturnValue({
      data: book,
      isPending: false,
    } as never);
    renderRecords();
    await userEvent.click(screen.getByRole("button", { name: "이전 달" }));
    expect(replace).toHaveBeenLastCalledWith(
      "/ledger/records?book=book-1&type=expense&month=2026-05",
      { scroll: false },
    );
    expect(scrollTo.mock.contexts.at(-1)).toBe(screen.getByTestId("scroller"));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0 });
    await userEvent.click(screen.getByRole("button", { name: "다음 달" }));
    expect(replace).toHaveBeenLastCalledWith(
      "/ledger/records?book=book-1&type=expense&month=2026-07",
      { scroll: false },
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("month arrows cross the year boundary from a month-only URL", async () => {
    state.search = "month=2026-01";
    renderRecords();
    await userEvent.click(screen.getByRole("button", { name: "이전 달" }));
    expect(replace).toHaveBeenLastCalledWith("/ledger/records?month=2025-12", {
      scroll: false,
    });
  });

  it("has no bottom add or previous-month buttons", () => {
    renderRecords();
    expect(screen.getAllByRole("link", { name: /기록 추가/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /월 기록 보기/ })).toBeNull();
  });

  it("ignores a legacy view param and never writes view to the URL", async () => {
    state.search = "date=2026-06-16&view=month";
    renderRecords();
    expect(screen.getByTestId("date-strip")).toHaveAttribute(
      "data-props",
      "selectedDate,today,entriesByDate",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "2026-06-17 선택" }),
    );
    expect(window.history.replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/ledger/records?date=2026-06-17",
    );
    await userEvent.click(screen.getByRole("button", { name: "이전 달" }));
    expect(replace).toHaveBeenLastCalledWith("/ledger/records?month=2026-05", {
      scroll: false,
    });
  });

  it("keeps the book chips mounted while the selected book loads so focus is not lost", () => {
    state.search = "date=2026-06-16&book=book-1";
    vi.mocked(useLedgerBook).mockReturnValue({
      data: undefined,
      isPending: true,
    } as never);
    const { rerender } = renderRecords();

    const chips = screen.getByRole("group", { name: "조회 장부" });
    expect(screen.queryByText("여행 기록")).not.toBeInTheDocument();
    expect(screen.queryByText("기록이 없어요")).not.toBeInTheDocument();

    vi.mocked(useLedgerBook).mockReturnValue({
      data: book,
      isPending: false,
    } as never);
    rerender(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <div data-testid="scroller" style={{ overflowY: "scroll" }}>
          <LedgerRecordsClient initialDate="2026-06-16" />
        </div>
      </QueryClientProvider>,
    );
    expect(screen.getByRole("group", { name: "조회 장부" })).toBe(chips);
  });

  it("specific active non-default book exposes the floating add button scoped to that book", () => {
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
    const add = screen.getByRole("link", { name: "기록 추가" });
    expect(add).toHaveAttribute(
      "href",
      "/ledger/records/new/daily?date=2026-06-16&book=book-1",
    );
    expect(add).toHaveClass("fixed", "size-14", "rounded-full");
    expect(screen.getByRole("status")).toHaveTextContent("공용 장부");
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
    expect(screen.getByRole("status")).toHaveTextContent(
      "기록을 바꾸려면 장부 관리에서 다시 활성화해주세요.",
    );
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
    expect(screen.queryByRole("link", { name: /기록 추가/ })).toBeNull();
    expect(useLedgerEntries).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it("date tap preserves book and filters in URL and drops the month", async () => {
    state.search = "book=book-1&month=2026-06&categoryId=category-1&view=month";
    vi.mocked(useLedgerBook).mockReturnValue({
      data: book,
      isPending: false,
    } as never);
    renderRecords();
    await userEvent.click(
      screen.getByRole("button", { name: "2026-06-17 선택" }),
    );
    expect(window.history.replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/ledger/records?book=book-1&categoryId=category-1&date=2026-06-17",
    );
  });

  it("falls back to the initial date's month for malformed date query values", () => {
    state.search = "date=2026-02-31";
    renderRecords();

    expect(useLedgerEntries).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2026, month: 6 }),
    );
    expect(screen.getByTestId("date-strip")).toHaveAttribute(
      "data-selected",
      "2026-06-16",
    );
  });

  it("opens an archived book on the month of the server's initial date", () => {
    state.search = "book=book-1";
    vi.mocked(useLedgerBook).mockReturnValue({
      data: { ...book, archivedAt: "2026-09-01Z" },
      isPending: false,
    } as never);
    renderRecords("2026-06-14");
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

  describe("scroll sync", () => {
    beforeEach(() => {
      vi.mocked(useLedgerEntries).mockReturnValue({
        data: [laterEntry, entry, earlierEntry, previousWeekEntry],
        isLoading: false,
      } as never);
    });

    it("selects the header caught below the sticky area and quietly updates the date", () => {
      state.search = "book=book-1&type=expense";
      vi.mocked(useLedgerBook).mockReturnValue({
        data: book,
        isPending: false,
      } as never);
      renderRecords();
      reportInitialHeaders();

      reportTopHeader("2026-06-14");

      expect(screen.getByTestId("date-strip")).toHaveAttribute(
        "data-selected",
        "2026-06-14",
      );
      expect(window.history.replaceState).toHaveBeenLastCalledWith(
        null,
        "",
        "/ledger/records?book=book-1&type=expense&date=2026-06-14",
      );
      expect(replace).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
      expect(screen.getByRole("link", { name: "기록 추가" })).toHaveAttribute(
        "href",
        "/ledger/records/new/daily?date=2026-06-14&book=book-1",
      );
    });

    it("moves the strip to the week of the caught header", () => {
      strip.isReal = true;
      state.search = "";
      renderRecords();
      reportInitialHeaders();
      expect(
        screen.getByRole("button", { name: /^6월 20일 토요일/ }),
      ).toBeInTheDocument();

      reportTopHeader("2026-06-03");

      expect(
        screen.getByRole("button", { name: /^6월 3일 수요일.*선택됨/ }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /^6월 20일 토요일/ }),
      ).toBeNull();
    });

    it("does not override the selection on the first notification after entering", () => {
      // A day without records: nothing to scroll to, so nothing holds sync.
      state.search = "date=2026-06-10";
      renderRecords();

      reportInitialHeaders("2026-06-14");

      expect(screen.getByTestId("date-strip")).toHaveAttribute(
        "data-selected",
        "2026-06-10",
      );
      expect(window.history.replaceState).not.toHaveBeenCalled();
    });

    it("keeps a tapped date while its programmatic scroll is running", async () => {
      renderRecords();
      reportInitialHeaders();
      finishProgrammaticScroll();

      await userEvent.click(
        screen.getByRole("button", { name: "2026-06-14 선택" }),
      );
      reportTopHeader("2026-06-20");
      reportTopHeader("2026-06-16");

      expect(screen.getByTestId("date-strip")).toHaveAttribute(
        "data-selected",
        "2026-06-14",
      );
      expect(window.history.replaceState).toHaveBeenLastCalledWith(
        null,
        "",
        "/ledger/records?date=2026-06-14",
      );

      finishProgrammaticScroll();
      reportTopHeader("2026-06-16");

      expect(screen.getByTestId("date-strip")).toHaveAttribute(
        "data-selected",
        "2026-06-16",
      );
    });

    it("treats a temporary empty section header like any other header", async () => {
      state.search = "";
      renderRecords();
      reportInitialHeaders();

      await userEvent.click(
        screen.getByRole("button", { name: "2026-06-17 선택" }),
      );
      finishProgrammaticScroll();
      reportInitialHeaders();
      reportTopHeader("2026-06-17");

      expect(screen.getByTestId("date-strip")).toHaveAttribute(
        "data-selected",
        "2026-06-17",
      );
      expect(section("17일 수요일")).toHaveTextContent("기록이 없어요");

      reportTopHeader("2026-06-16");

      expect(screen.getByTestId("date-strip")).toHaveAttribute(
        "data-selected",
        "2026-06-16",
      );
      expect(screen.queryByText("기록이 없어요")).not.toBeInTheDocument();
    });

    it("returning to the top quietly swaps the date for the month and selects the top header", () => {
      state.search = "book=book-1&date=2026-06-14&type=expense";
      vi.mocked(useLedgerBook).mockReturnValue({
        data: book,
        isPending: false,
      } as never);
      renderRecords();
      reportInitialHeaders("2026-06-14");
      finishProgrammaticScroll();

      reportNoHeaderCaught();

      expect(window.history.replaceState).toHaveBeenLastCalledWith(
        null,
        "",
        "/ledger/records?book=book-1&type=expense&month=2026-06",
      );
      expect(replace).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
      expect(screen.getByTestId("date-strip")).toHaveAttribute(
        "data-selected",
        "2026-06-20",
      );
      expect(screen.getByRole("link", { name: /나중 기록/ })).toHaveAttribute(
        "href",
        "/ledger/records/entry-2?from=records&date=2026-06-20&returnTo=%2Fledger%2Frecords%3Fbook%3Dbook-1%26type%3Dexpense%26month%3D2026-06",
      );
    });

    it("returning to the top drops a tapped empty day", async () => {
      state.search = "";
      renderRecords();
      reportInitialHeaders();
      await userEvent.click(
        screen.getByRole("button", { name: "2026-06-17 선택" }),
      );
      finishProgrammaticScroll();
      reportInitialHeaders();
      reportTopHeader("2026-06-17");

      reportNoHeaderCaught();

      expect(window.history.replaceState).toHaveBeenLastCalledWith(
        null,
        "",
        "/ledger/records?month=2026-06",
      );
      expect(screen.getByTestId("date-strip")).toHaveAttribute(
        "data-selected",
        "2026-06-20",
      );
      expect(screen.queryByText("기록이 없어요")).not.toBeInTheDocument();
    });

    it("keeps a tapped date when the list passes the top during its programmatic scroll", async () => {
      renderRecords();
      reportInitialHeaders();
      finishProgrammaticScroll();

      await userEvent.click(
        screen.getByRole("button", { name: "2026-06-14 선택" }),
      );
      reportNoHeaderCaught();

      expect(screen.getByTestId("date-strip")).toHaveAttribute(
        "data-selected",
        "2026-06-14",
      );
      expect(window.history.replaceState).toHaveBeenLastCalledWith(
        null,
        "",
        "/ledger/records?date=2026-06-14",
      );
    });

    it("does not touch the URL at the top when nothing was scrolled", () => {
      state.search = "";
      renderRecords();
      reportInitialHeaders();

      reportNoHeaderCaught();

      expect(window.history.replaceState).not.toHaveBeenCalled();
    });

    it("puts the current date into the detail link's returnTo", () => {
      state.search = "categoryId=category-1";
      renderRecords();
      reportInitialHeaders();

      reportTopHeader("2026-06-14");

      expect(screen.getByRole("link", { name: /지난 기록/ })).toHaveAttribute(
        "href",
        "/ledger/records/entry-0?from=records&date=2026-06-14&returnTo=%2Fledger%2Frecords%3FcategoryId%3Dcategory-1%26date%3D2026-06-14",
      );
    });
  });
});
