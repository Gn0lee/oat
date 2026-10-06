import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { LedgerBookListItem } from "@/types/ledger-book";
import { LedgerBookPickerPanel } from "./LedgerBookPickerPanel";

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

const books = [
  book("여행", { lastEntryAt: "2026-03-01T00:00:00Z" }),
  book("가족", { isDefault: true }),
  book("용돈", { visibility: "personal", lastEntryAt: "2026-05-01T00:00:00Z" }),
  book("지난 이사", {
    archivedAt: "2026-04-01T00:00:00Z",
    lastEntryAt: "2026-02-01T00:00:00Z",
  }),
];

function bookButtons() {
  return within(screen.getByRole("list", { name: "장부" })).getAllByRole(
    "button",
  );
}

describe("LedgerBookPickerPanel", () => {
  it("lists books default first, then most recently used", () => {
    render(
      <LedgerBookPickerPanel
        books={books}
        title="장부 선택"
        archived="current-disabled"
        onValueChange={() => undefined}
      />,
    );

    expect(screen.getByRole("heading", { name: "장부 선택" })).toBeVisible();
    expect(bookButtons().map((button) => button.textContent)).toEqual([
      "가족공용 · 기본",
      "용돈개인",
      "여행공용",
    ]);
  });

  it("marks the selected book and reports a new choice", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <LedgerBookPickerPanel
        books={books}
        value="가족"
        title="장부 선택"
        archived="current-disabled"
        onValueChange={onValueChange}
      />,
    );

    expect(screen.getByRole("button", { name: /^가족/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /^여행/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(screen.getByRole("button", { name: /^여행/ }));
    expect(onValueChange).toHaveBeenCalledWith("여행");
  });

  it("keeps rows at least 44px tall", () => {
    render(
      <LedgerBookPickerPanel
        books={books}
        title="장부 선택"
        archived="current-disabled"
        onValueChange={() => undefined}
      />,
    );

    for (const button of bookButtons()) {
      expect(button).toHaveClass("min-h-11");
    }
  });

  it("closes from the header button", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <LedgerBookPickerPanel
        books={books}
        title="장부 선택"
        archived="current-disabled"
        onBack={onBack}
        onValueChange={() => undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: "닫기" }));
    expect(onBack).toHaveBeenCalled();
  });

  describe('archived="current-disabled"', () => {
    it("hides archived books", () => {
      render(
        <LedgerBookPickerPanel
          books={books}
          value="가족"
          title="장부 선택"
          archived="current-disabled"
          onValueChange={() => undefined}
        />,
      );

      expect(screen.queryByText(/지난 이사/)).not.toBeInTheDocument();
    });

    it("shows the current archived book as unavailable", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <LedgerBookPickerPanel
          books={books}
          value="지난 이사"
          title="장부 선택"
          archived="current-disabled"
          onValueChange={onValueChange}
        />,
      );

      const archivedButton = screen.getByRole("button", {
        name: /지난 이사 \(보관됨\)/,
      });
      expect(archivedButton).toBeDisabled();
      expect(archivedButton).toHaveAttribute("aria-pressed", "true");
      await user.click(archivedButton);
      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  describe('archived="section"', () => {
    it("lists archived books in a separate selectable section", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <LedgerBookPickerPanel
          books={books}
          title="장부 선택"
          archived="section"
          onValueChange={onValueChange}
        />,
      );

      expect(bookButtons()).toHaveLength(3);
      const archivedList = screen.getByRole("list", { name: "보관" });
      const archivedButton = within(archivedList).getByRole("button", {
        name: /지난 이사/,
      });
      expect(archivedButton).toBeEnabled();
      await user.click(archivedButton);
      expect(onValueChange).toHaveBeenCalledWith("지난 이사");
    });

    it("omits the archived section when there are no archived books", () => {
      render(
        <LedgerBookPickerPanel
          books={books.filter((entry) => !entry.archivedAt)}
          title="장부 선택"
          archived="section"
          onValueChange={() => undefined}
        />,
      );

      expect(
        screen.queryByRole("list", { name: "보관" }),
      ).not.toBeInTheDocument();
    });
  });
});
