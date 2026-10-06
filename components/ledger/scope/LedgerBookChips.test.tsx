import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { LedgerBookListItem } from "@/types/ledger-book";
import { LedgerBookChips } from "./LedgerBookChips";

// jsdom에서는 vaul 닫힘 애니메이션이 끝나지 않으므로 open 상태만 흉내 낸다.
vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
  }) =>
    open ? (
      <div role="dialog">
        {children}
        <button type="button" onClick={() => onOpenChange(false)}>
          Dismiss drawer
        </button>
      </div>
    ) : null,
  DrawerContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DrawerDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
}));

function book(overrides: Partial<LedgerBookListItem>): LedgerBookListItem {
  return {
    id: "book",
    name: "장부",
    visibility: "shared",
    createdBy: "user-1",
    isDefault: false,
    archivedAt: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    lastEntryAt: null,
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

  it("긴 장부 이름이 페이지를 가로로 넓히지 않도록 칩 안에서 말줄임한다", () => {
    const longName = "아주 긴 이름을 가진 가족 여행 적립 장부";
    render(
      <LedgerBookChips
        books={[book({ id: "long", name: longName })]}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("group", { name: "조회 장부" })).toHaveClass(
      "min-w-0",
    );
    const name = screen.getByText(longName);
    expect(name).toHaveClass("truncate");
    expect(name.className).toMatch(/max-w-/);
  });

  it("보관 장부까지 6개 이하이면 모든 칩을 보여주고 장부 선택은 없다", () => {
    render(<LedgerBookChips books={manyBooks(6, 1)} onSelect={vi.fn()} />);

    expect(chipNames()).toEqual([
      "전체",
      "기본",
      "장부 1",
      "장부 2",
      "장부 3",
      "장부 4",
      "보관 1보관",
    ]);
    expect(
      screen.queryByRole("button", { name: "장부 선택" }),
    ).not.toBeInTheDocument();
  });

  it("보관 장부를 합쳐 7개면 기본 장부와 최근 사용 활성 장부 5개, 장부 선택만 보여준다", () => {
    render(<LedgerBookChips books={manyBooks(7, 1)} onSelect={vi.fn()} />);

    expect(chipNames()).toEqual([
      "전체",
      "기본",
      "장부 1",
      "장부 2",
      "장부 3",
      "장부 4",
      "장부 5",
      "장부 선택",
    ]);
  });

  it("칩 밖 장부가 직접 링크로 선택되면 전체 바로 뒤에 선택된 임시 칩으로 보여준다", () => {
    render(
      <LedgerBookChips
        books={manyBooks(8)}
        selectedBookId="book-7"
        onSelect={vi.fn()}
      />,
    );

    expect(chipNames().slice(0, 3)).toEqual(["전체", "장부 7", "기본"]);
    expect(screen.getByRole("button", { name: "장부 7" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "장부 선택" }),
    ).not.toHaveAttribute("aria-pressed");
  });

  it("직접 링크로 보관 장부가 선택되면 보관 표시와 함께 임시 칩으로 보여준다", () => {
    render(
      <LedgerBookChips
        books={manyBooks(7, 1)}
        selectedBookId="archived-1"
        onSelect={vi.fn()}
      />,
    );

    expect(chipNames().slice(0, 2)).toEqual(["전체", "보관 1보관"]);
    expect(screen.getByRole("button", { name: /보관 1/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("장부 선택 칩도 터치 영역이 44px 이상이고 시트를 연다고 알린다", () => {
    render(<LedgerBookChips books={manyBooks(7)} onSelect={vi.fn()} />);

    const picker = screen.getByRole("button", { name: "장부 선택" });
    expect(picker).toHaveClass("min-h-11");
    expect(picker).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("장부 선택 시트에서 보관 장부까지 고를 수 있고, 고르면 onSelect 후 시트를 닫고 칩으로 포커스를 돌린다", async () => {
    const onSelect = vi.fn();
    render(<LedgerBookChips books={manyBooks(8, 1)} onSelect={onSelect} />);

    const picker = screen.getByRole("button", { name: "장부 선택" });
    fireEvent.click(picker);
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("장부 6")).toBeInTheDocument();
    expect(within(sheet).getByText("보관 1")).toBeInTheDocument();

    fireEvent.click(rowButton(within(sheet).getByText("장부 6")));

    expect(onSelect).toHaveBeenCalledWith("book-6");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(picker).toHaveFocus());
  });

  it("시트는 현재 선택된 장부를 선택 상태로 보여준다", async () => {
    render(
      <LedgerBookChips
        books={manyBooks(8)}
        selectedBookId="book-7"
        onSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "장부 선택" }));
    const sheet = await screen.findByRole("dialog");
    expect(rowButton(within(sheet).getByText("장부 7"))).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("시트에서 보관 장부를 고르면 그 장부 ID를 넘긴다", async () => {
    const onSelect = vi.fn();
    render(<LedgerBookChips books={manyBooks(8, 1)} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "장부 선택" }));
    const sheet = await screen.findByRole("dialog");
    fireEvent.click(rowButton(within(sheet).getByText("보관 1")));

    expect(onSelect).toHaveBeenCalledWith("archived-1");
  });

  it("시트에서 고른 장부가 선택되면 전체 바로 뒤에 임시 칩으로 보인다", async () => {
    function Harness() {
      const [selected, setSelected] = useState<string | undefined>();
      return (
        <LedgerBookChips
          books={manyBooks(8)}
          selectedBookId={selected}
          onSelect={setSelected}
        />
      );
    }
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "장부 선택" }));
    const sheet = await screen.findByRole("dialog");
    fireEvent.click(rowButton(within(sheet).getByText("장부 7")));

    await waitFor(() =>
      expect(chipNames().slice(0, 2)).toEqual(["전체", "장부 7"]),
    );
    expect(screen.getByRole("button", { name: "장부 7" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it.each(["닫기", "Dismiss drawer"])(
    "시트를 %s로 닫아도 onSelect 없이 칩으로 포커스를 돌린다",
    async (closeName) => {
      const onSelect = vi.fn();
      render(<LedgerBookChips books={manyBooks(7)} onSelect={onSelect} />);

      const picker = screen.getByRole("button", { name: "장부 선택" });
      fireEvent.click(picker);
      const sheet = await screen.findByRole("dialog");
      fireEvent.click(within(sheet).getByRole("button", { name: closeName }));

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      await waitFor(() => expect(picker).toHaveFocus());
      expect(onSelect).not.toHaveBeenCalled();
    },
  );
});

/** 기본 장부 1개 + 최근 입력 순 활성 장부 + 보관 장부. 합계는 total */
function manyBooks(total: number, archivedCount = 0): LedgerBookListItem[] {
  const activeCount = total - 1 - archivedCount;
  return [
    book({ id: "default", name: "기본", isDefault: true }),
    ...Array.from({ length: activeCount }, (_, index) =>
      book({
        id: `book-${index + 1}`,
        name: `장부 ${index + 1}`,
        lastEntryAt: `2026-10-${String(20 - index).padStart(2, "0")}T00:00:00Z`,
      }),
    ),
    ...Array.from({ length: archivedCount }, (_, index) =>
      book({
        id: `archived-${index + 1}`,
        name: `보관 ${index + 1}`,
        archivedAt: "2026-09-01T00:00:00Z",
        lastEntryAt: "2026-10-30T00:00:00Z",
      }),
    ),
  ];
}

function chipNames() {
  return within(screen.getByRole("group", { name: "조회 장부" }))
    .getAllByRole("button")
    .map((button) => button.textContent);
}

function rowButton(label: HTMLElement) {
  const row = label.closest("button");
  if (!row) throw new Error("장부 행 버튼을 찾지 못했습니다");
  return row;
}
