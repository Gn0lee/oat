import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLedgerBook, useLedgerBooks } from "@/hooks/use-ledger-books";
import { useLedgerEntrySearch } from "@/hooks/use-ledger-entries";
import { ApiQueryError } from "@/lib/api/client";
import type { LedgerEntrySearchItem } from "@/lib/api/ledger";
import { LedgerSearchClient } from "./LedgerSearchClient";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
vi.mock("@/hooks/use-ledger-entries", () => ({
  useLedgerEntrySearch: vi.fn(),
}));
vi.mock("@/hooks/use-ledger-books", () => ({
  useLedgerBooks: vi.fn(),
  useLedgerBook: vi.fn(),
}));
vi.mock("@/hooks/use-ledger-identity", () => ({
  useLedgerIdentity: () => ({
    userId: "user",
    householdId: "household",
    role: "member",
  }),
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
const item = {
  id: "entry-1",
  householdId: "household",
  ownerId: "user",
  ownerName: "나",
  type: "expense",
  amount: 4500,
  title: "커피",
  categoryId: null,
  categoryName: null,
  categoryIcon: null,
  fromAccountId: null,
  fromAccountName: null,
  fromPaymentMethodId: null,
  fromPaymentMethodName: "현대카드",
  toAccountId: null,
  toAccountName: null,
  toPaymentMethodId: null,
  toPaymentMethodName: null,
  isShared: true,
  memo: "원두 커피",
  memoMatched: true,
  transactedAt: "2026-10-03T01:00:00Z",
  createdAt: "",
  updatedAt: "",
  bookId: "old-book",
  book: {
    name: "이사",
    visibility: "shared",
    archivedAt: "2026-09-01T00:00:00Z",
  },
} satisfies LedgerEntrySearchItem;

function mockSearch(overrides: Record<string, unknown> = {}) {
  vi.mocked(useLedgerEntrySearch).mockReturnValue({
    data: { pages: [{ items: [item], nextCursor: null }] },
    isLoading: false,
    isError: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.mocked(useLedgerBooks).mockReturnValue({
    data: [book],
    isPending: false,
  } as never);
  vi.mocked(useLedgerBook).mockReturnValue({
    data: undefined,
    isPending: false,
  } as never);
  mockSearch();
});

describe("LedgerSearchClient", () => {
  it("전체 범위 결과에 장부 이름·보관 상태와 거래일을 표시한다", () => {
    render(<LedgerSearchClient initialQuery="커피" />);
    expect(useLedgerEntrySearch).toHaveBeenCalledWith("커피", undefined);
    const link = screen.getByRole("link", { name: /커피/ });
    expect(link).toHaveTextContent("이사 · 보관");
    expect(link).toHaveTextContent("2026.10.03");
    expect(link).toHaveTextContent("메모: 원두 커피");
    expect(link).toHaveAttribute(
      "href",
      "/ledger/records/entry-1?from=search&q=%EC%BB%A4%ED%94%BC",
    );
  });

  it("장부 범위에서는 그 장부로 검색하고 상세 복귀에 장부를 넘긴다", () => {
    vi.mocked(useLedgerBook).mockReturnValue({
      data: book,
      isPending: false,
    } as never);
    render(<LedgerSearchClient initialQuery="커피" initialBookId="book-1" />);
    expect(useLedgerEntrySearch).toHaveBeenCalledWith("커피", "book-1");
    expect(screen.getByRole("link", { name: /커피/ })).toHaveAttribute(
      "href",
      "/ledger/records/entry-1?from=search&q=%EC%BB%A4%ED%94%BC&book=book-1",
    );
    expect(screen.getByRole("button", { name: "여행비" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("장부를 바꾸면 검색어를 유지한 채 새 범위의 첫 페이지로 간다", async () => {
    render(<LedgerSearchClient initialQuery="커피" />);
    await userEvent.click(screen.getByRole("button", { name: "여행비" }));
    expect(push).toHaveBeenCalledWith(
      "/ledger/search?q=%EC%BB%A4%ED%94%BC&book=book-1",
    );
  });

  it("이미 선택한 장부 칩을 다시 눌러도 이동하지 않는다", async () => {
    render(<LedgerSearchClient initialQuery="커피" />);
    await userEvent.click(screen.getByRole("button", { name: "전체" }));
    expect(push).not.toHaveBeenCalled();
  });

  it("검색어 없이 장부를 바꾸면 장부만 URL에 둔다", async () => {
    mockSearch({ data: undefined });
    render(<LedgerSearchClient initialQuery="" />);
    await userEvent.click(screen.getByRole("button", { name: "여행비" }));
    expect(push).toHaveBeenCalledWith("/ledger/search?book=book-1");
  });

  it("제출하면 현재 장부를 유지하고, 1자 검색어는 이동하지 않고 안내한다", async () => {
    vi.mocked(useLedgerBook).mockReturnValue({
      data: book,
      isPending: false,
    } as never);
    render(<LedgerSearchClient initialQuery="" initialBookId="book-1" />);
    const input = screen.getByRole("searchbox", { name: "가계부 내역 검색어" });

    await userEvent.type(input, "a{enter}");
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByText("검색어를 2자 이상 입력해주세요.")).toBeVisible();

    await userEvent.clear(input);
    await userEvent.type(input, " 점심 {enter}");
    expect(push).toHaveBeenCalledWith(
      "/ledger/search?q=%EC%A0%90%EC%8B%AC&book=book-1",
    );
  });

  it("더 보기로 다음 페이지를 불러온다", () => {
    const fetchNextPage = vi.fn();
    mockSearch({ hasNextPage: true, fetchNextPage });
    render(<LedgerSearchClient initialQuery="커피" />);
    fireEvent.click(screen.getByRole("button", { name: "더 보기" }));
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it("볼 수 없는 장부는 전체 결과로 바꾸지 않고 검색어를 유지한 전체 이동을 제안한다", () => {
    vi.mocked(useLedgerBook).mockReturnValue({
      data: undefined,
      error: new ApiQueryError("BOOK_UNAVAILABLE", "x", 404),
      isPending: false,
    } as never);
    mockSearch({
      data: undefined,
      isError: true,
      error: new ApiQueryError("BOOK_UNAVAILABLE", "x", 404),
    });
    render(<LedgerSearchClient initialQuery="커피" initialBookId="hidden" />);
    expect(screen.getByText("장부를 볼 수 없음")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "전체 장부로 이동" }),
    ).toHaveAttribute("href", "/ledger/search?q=%EC%BB%A4%ED%94%BC");
    expect(screen.queryByText("커피 | 현대카드")).not.toBeInTheDocument();
  });

  it("보관 장부를 고르면 읽기 전용 상태를 한 줄로 알린다", () => {
    vi.mocked(useLedgerBook).mockReturnValue({
      data: { ...book, archivedAt: "2026-09-01T00:00:00Z" },
      isPending: false,
    } as never);
    render(<LedgerSearchClient initialQuery="커피" initialBookId="book-1" />);
    expect(screen.getByRole("status")).toHaveTextContent("보관됨 · 읽기 전용");
  });

  it("달력으로 갈 때는 장부만 넘긴다", () => {
    render(<LedgerSearchClient initialQuery="커피" initialBookId="book-1" />);
    expect(screen.getByRole("link", { name: "달력 보기" })).toHaveAttribute(
      "href",
      "/ledger/records?book=book-1",
    );
  });
});
