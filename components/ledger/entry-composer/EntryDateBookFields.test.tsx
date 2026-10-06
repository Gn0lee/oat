import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LedgerComposerValues } from "@/schemas/ledger-composer";
import type { LedgerBookListItem } from "@/types/ledger-book";
import { EntryBookNotice, EntryDateBookFields } from "./EntryDateBookFields";

const media = vi.hoisted(() => ({ desktop: false }));
const books = vi.hoisted(() => ({ list: [] as LedgerBookListItem[] }));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => media.desktop,
}));
vi.mock("@/hooks/use-ledger-books", () => ({
  useLedgerBooks: () => ({ data: books.list }),
}));
vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  DrawerContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DrawerDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
}));

const SHARED = "11111111-1111-4111-8111-111111111111";
const PERSONAL = "22222222-2222-4222-8222-222222222222";
const TRIP = "33333333-3333-4333-8333-333333333333";
const OLD = "44444444-4444-4444-8444-444444444444";

function book(
  id: string,
  name: string,
  overrides: Partial<LedgerBookListItem> = {},
): LedgerBookListItem {
  return {
    id,
    name,
    visibility: "shared",
    createdBy: "user-1",
    isDefault: false,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    lastEntryAt: null,
    ...overrides,
  };
}

function BookValue() {
  const bookId = useWatch<LedgerComposerValues>({ name: "items.0.bookId" });
  return <output aria-label="폼 장부">{String(bookId)}</output>;
}

function Harness({ bookId }: { bookId: string }) {
  const form = useForm<LedgerComposerValues>({
    defaultValues: {
      items: [
        {
          clientId: "row-1",
          type: "expense",
          bookId,
          amount: "",
          title: "",
          transactedAt: "2026-06-05",
        },
      ],
    },
  });
  return (
    <FormProvider {...form}>
      <EntryDateBookFields index={0} />
      <EntryBookNotice index={0} />
      <BookValue />
      <output aria-label="수정됨">{String(form.formState.isDirty)}</output>
    </FormProvider>
  );
}

function sheetBooks() {
  return within(screen.getByRole("list", { name: "장부" })).getAllByRole(
    "button",
  );
}

beforeEach(() => {
  media.desktop = false;
  books.list = [
    book(TRIP, "여행", { lastEntryAt: "2026-03-01T00:00:00Z" }),
    book(SHARED, "공용 생활비", { isDefault: true }),
    book(PERSONAL, "용돈", {
      visibility: "personal",
      lastEntryAt: "2026-05-01T00:00:00Z",
    }),
    book(OLD, "지난 이사", { archivedAt: "2026-04-01T00:00:00Z" }),
  ];
});

describe("EntryDateBookFields book picker (mobile)", () => {
  it("opens a sheet ordered default → recent with visibility and default marks", async () => {
    const user = userEvent.setup();
    render(<Harness bookId={SHARED} />);

    const trigger = screen.getByRole("combobox", { name: "장부 1" });
    expect(trigger).toHaveTextContent("공용 생활비");
    expect(trigger).toHaveClass("min-h-11");
    await user.click(trigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(sheetBooks().map((button) => button.textContent)).toEqual([
      "공용 생활비공용 · 기본",
      "용돈개인",
      "여행공용",
    ]);
    expect(
      screen.getByRole("button", { name: /^공용 생활비/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("changes the form value, closes the sheet and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Harness bookId={SHARED} />);

    const trigger = screen.getByRole("combobox", { name: "장부 1" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: /^용돈/ }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "폼 장부" })).toHaveTextContent(
      PERSONAL,
    );
    expect(screen.getByRole("status", { name: "수정됨" })).toHaveTextContent(
      "true",
    );
    expect(trigger).toHaveTextContent("용돈");
    expect(screen.getByText("개인 장부")).toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("returns focus to the trigger when the sheet is closed without choosing", async () => {
    const user = userEvent.setup();
    render(<Harness bookId={SHARED} />);

    const trigger = screen.getByRole("combobox", { name: "장부 1" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "닫기" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "폼 장부" })).toHaveTextContent(
      SHARED,
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("shows an archived current book as unavailable and hides other archived books", async () => {
    const user = userEvent.setup();
    books.list.push(
      book("55555555-5555-4555-8555-555555555555", "다른 보관", {
        archivedAt: "2026-04-02T00:00:00Z",
      }),
    );
    render(<Harness bookId={OLD} />);

    const trigger = screen.getByRole("combobox", { name: "장부 1" });
    expect(trigger).toHaveTextContent("지난 이사 (보관됨)");
    await user.click(trigger);

    const archived = screen.getByRole("button", {
      name: /^지난 이사 \(보관됨\)/,
    });
    expect(archived).toBeDisabled();
    expect(screen.queryByText(/다른 보관/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^여행/ })).toBeEnabled();
  });
});

describe("EntryDateBookFields book picker (desktop)", () => {
  it("uses the same panel in a popover", async () => {
    media.desktop = true;
    const user = userEvent.setup();
    render(<Harness bookId={SHARED} />);

    const trigger = screen.getByRole("combobox", { name: "장부 1" });
    await user.click(trigger);
    expect(sheetBooks()).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: /^여행/ }));

    expect(screen.getByRole("status", { name: "폼 장부" })).toHaveTextContent(
      TRIP,
    );
    await waitFor(() =>
      expect(screen.queryByRole("list", { name: "장부" })).toBeNull(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
