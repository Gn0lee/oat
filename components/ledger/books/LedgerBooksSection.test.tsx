import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLedgerBooks } from "@/hooks/use-ledger-books";
import type { LedgerBookListItem } from "@/types/ledger-book";
import { LedgerBooksSection } from "./LedgerBooksSection";

vi.mock("@/hooks/use-ledger-books", () => ({ useLedgerBooks: vi.fn() }));

function book(
  id: string,
  overrides: Partial<LedgerBookListItem> = {},
): LedgerBookListItem {
  return {
    id,
    name: id,
    visibility: "shared",
    createdBy: "me",
    isDefault: false,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    lastEntryAt: null,
    ...overrides,
  };
}

function mockBooks(books: LedgerBookListItem[]) {
  vi.mocked(useLedgerBooks).mockReturnValue({
    data: books,
    isLoading: false,
    error: null,
  } as never);
}

function bookLinks() {
  return screen
    .getAllByRole("link")
    .filter((link) => link.getAttribute("href")?.startsWith("/ledger/records"));
}

describe("LedgerBooksSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("기본 장부를 맨 위에 두고 최근 사용 순으로 보여주며 행에 아이콘이 없다", () => {
    mockBooks([
      book("생활비", { isDefault: true }),
      book("여행", { lastEntryAt: "2026-09-01T00:00:00Z" }),
      book("이사", { lastEntryAt: "2026-10-06T00:00:00Z" }),
      book("내 용돈", { visibility: "personal" }),
    ]);

    render(<LedgerBooksSection />);

    const links = bookLinks();
    expect(links.map((link) => link.textContent)).toEqual([
      expect.stringContaining("생활비"),
      expect.stringContaining("이사"),
      expect.stringContaining("여행"),
      expect.stringContaining("내 용돈"),
    ]);
    expect(within(links[0]).getByText("기본")).toBeInTheDocument();
    expect(within(links[3]).getByText("개인 장부")).toBeInTheDocument();
    for (const link of links) {
      expect(link.querySelector("svg.lucide-book-open")).toBeNull();
    }
    expect(screen.queryByText(/장부 전체/)).not.toBeInTheDocument();
  });

  it("활성 장부가 5개 이상이면 4개만 보여주고 장부 전체 n개로 관리 화면에 연결한다", () => {
    mockBooks([
      book("생활비", { isDefault: true }),
      book("a", { lastEntryAt: "2026-10-05T00:00:00Z" }),
      book("b", { lastEntryAt: "2026-10-04T00:00:00Z" }),
      book("c", { lastEntryAt: "2026-10-03T00:00:00Z" }),
      book("d", { lastEntryAt: "2026-10-02T00:00:00Z" }),
      book("보관", { archivedAt: "2026-10-01T00:00:00Z" }),
    ]);

    render(<LedgerBooksSection />);

    expect(bookLinks().map((link) => link.textContent)).toEqual([
      expect.stringContaining("생활비"),
      expect.stringContaining("a"),
      expect.stringContaining("b"),
      expect.stringContaining("c"),
    ]);
    expect(screen.queryByText("d")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /장부 전체 5개/ })).toHaveAttribute(
      "href",
      "/ledger/books",
    );
  });

  it("활성 장부가 4개면 보관 장부가 있어도 장부 전체 행이 없다", () => {
    mockBooks([
      book("생활비", { isDefault: true }),
      book("a"),
      book("b"),
      book("c"),
      book("보관", { archivedAt: "2026-10-01T00:00:00Z" }),
    ]);

    render(<LedgerBooksSection />);

    expect(bookLinks()).toHaveLength(4);
    expect(screen.queryByText(/장부 전체/)).not.toBeInTheDocument();
  });
});
