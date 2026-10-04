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
vi.mock("next/navigation", () => ({
  usePathname: () => "/ledger/records",
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
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
vi.mock("./LedgerCalendar", () => ({
  LedgerCalendar: ({
    onDateSelect,
  }: {
    onDateSelect: (date: Date) => void;
  }) => (
    <button type="button" onClick={() => onDateSelect(new Date(2026, 5, 17))}>
      다음 날짜 선택
    </button>
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
    expect(screen.getByRole("link", { name: /가계부 등록/ })).toHaveAttribute(
      "href",
      "/ledger/records/new/daily?date=2026-06-16&book=book-1",
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
      screen.queryByRole("link", { name: /가계부 등록/ }),
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
  it("date change preserves book and filters in URL", async () => {
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
      screen.getByRole("heading", { name: /6월 16일/ }),
    ).toBeInTheDocument();
    expect(useLedgerEntries).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2026, month: 6 }),
    );
    expect(
      vi
        .mocked(useLedgerEntries)
        .mock.calls.every(
          ([params]) =>
            Number.isFinite(params?.year) && Number.isFinite(params?.month),
        ),
    ).toBe(true);
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
    expect(useLedgerEntries).toHaveBeenCalledTimes(3);
    expect(
      vi
        .mocked(useLedgerEntries)
        .mock.calls.every(([params]) => params?.enabled === false),
    ).toBe(true);
  });
});
