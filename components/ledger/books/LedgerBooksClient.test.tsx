import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLedgerBooks } from "@/hooks/use-ledger-books";
import { LedgerBooksClient } from "./LedgerBooksClient";

const identity = vi.hoisted(() => ({
  userId: "me" as string | null,
  householdId: "household" as string | null,
  role: "member" as const,
}));
vi.mock("@/hooks/use-ledger-books", () => ({ useLedgerBooks: vi.fn() }));
vi.mock("@/hooks/use-ledger-identity", () => ({
  useLedgerIdentity: () => identity,
}));

describe("LedgerBooksClient", () => {
  beforeEach(() => {
    identity.userId = "me";
    identity.householdId = "household";
    vi.clearAllMocks();
  });

  it("shows visible books with their scope and archived state", () => {
    vi.mocked(useLedgerBooks).mockReturnValue({
      data: [
        {
          id: "shared-book",
          name: "생활비",
          visibility: "shared",
          createdBy: null,
          isDefault: true,
          archivedAt: null,
          createdAt: "now",
          updatedAt: "now",
        },
        {
          id: "own-book",
          name: "여행",
          visibility: "personal",
          createdBy: "me",
          isDefault: false,
          archivedAt: "yesterday",
          createdAt: "now",
          updatedAt: "now",
        },
      ],
      isLoading: false,
      error: null,
    } as never);

    render(<LedgerBooksClient />);

    expect(screen.getByText("생활비")).toBeInTheDocument();
    expect(screen.getByText("개인 · 보관됨 · 읽기 전용")).toBeInTheDocument();
    expect(
      screen.queryByText("다른 구성원의 개인 가계부"),
    ).not.toBeInTheDocument();
  });

  it("lists active books in recently used order before archived books", () => {
    const base = {
      visibility: "shared" as const,
      createdBy: "me",
      isDefault: false,
      archivedAt: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      lastEntryAt: null,
    };
    vi.mocked(useLedgerBooks).mockReturnValue({
      data: [
        {
          ...base,
          id: "archived",
          name: "지난 여행",
          archivedAt: "2026-09-01T00:00:00Z",
          lastEntryAt: "2026-10-06T00:00:00Z",
        },
        { ...base, id: "empty", name: "빈 장부" },
        {
          ...base,
          id: "trip",
          name: "여행",
          lastEntryAt: "2026-10-05T00:00:00Z",
        },
        { ...base, id: "default", name: "생활비", isDefault: true },
      ],
      isLoading: false,
      error: null,
    } as never);

    render(<LedgerBooksClient />);

    expect(
      screen
        .getAllByRole("link")
        .filter((link) =>
          link.getAttribute("href")?.startsWith("/ledger/books/"),
        )
        .filter((link) => !link.getAttribute("href")?.includes("/new"))
        .map((link) => link.querySelector("p")?.textContent),
    ).toEqual(["생활비", "여행", "빈 장부", "지난 여행"]);
  });

  it("offers household setup instead of an empty list when membership is missing", () => {
    identity.userId = "me";
    identity.householdId = null;
    vi.mocked(useLedgerBooks).mockReturnValue({
      data: undefined,
      isLoading: false,
      isPending: true,
    } as never);

    render(<LedgerBooksClient />);

    expect(screen.getByText("가구 설정이 필요해요")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "가구 설정으로 이동" }),
    ).toHaveAttribute("href", "/settings/household");
  });
});
