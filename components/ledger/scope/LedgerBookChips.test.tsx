import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LedgerBook } from "@/types/ledger-book";
import { LedgerBookChips } from "./LedgerBookChips";

function book(overrides: Partial<LedgerBook>): LedgerBook {
  return {
    id: "book",
    name: "장부",
    visibility: "shared",
    createdBy: "user-1",
    isDefault: false,
    archivedAt: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

const books = [
  book({ id: "old", name: "이사", archivedAt: "2026-09-01T00:00:00Z" }),
  book({ id: "travel", name: "여행비" }),
  book({ id: "mine", name: "용돈", visibility: "personal" }),
  book({ id: "living", name: "생활비", isDefault: true }),
];

describe("LedgerBookChips", () => {
  it("전체, 기본 장부, 활성 장부, 보관 장부 순서로 칩을 보여준다", () => {
    render(<LedgerBookChips books={books} onSelect={vi.fn()} />);

    const group = screen.getByRole("group", { name: "조회 장부" });
    const names = within(group)
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(names).toEqual(["전체", "생활비", "여행비", "용돈개인", "이사보관"]);
  });

  it("선택 상태를 aria-pressed로 전달하고 장부 없이는 전체가 선택된다", () => {
    const { rerender } = render(
      <LedgerBookChips books={books} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    rerender(
      <LedgerBookChips books={books} selectedBookId="old" onSelect={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: /이사/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("칩을 누르면 장부 ID를, 전체를 누르면 undefined를 넘긴다", () => {
    const onSelect = vi.fn();
    render(
      <LedgerBookChips
        books={books}
        selectedBookId="travel"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /용돈/ }));
    fireEvent.click(screen.getByRole("button", { name: "전체" }));
    expect(onSelect).toHaveBeenNthCalledWith(1, "mine");
    expect(onSelect).toHaveBeenNthCalledWith(2, undefined);
  });

  it("터치 영역은 44px 이상이다", () => {
    render(<LedgerBookChips books={books} onSelect={vi.fn()} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveClass("min-h-11");
    }
  });
});
