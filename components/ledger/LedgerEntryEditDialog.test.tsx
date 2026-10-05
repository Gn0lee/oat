import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiQueryError } from "@/lib/api/client";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { LedgerEntryEditDialog } from "./LedgerEntryEditDialog";

const { mutateAsync, media } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  media: { desktop: true },
}));
vi.mock("@/hooks/use-ledger-entries", async () => {
  const React = await import("react");
  return {
    useUpdateLedgerEntry: () => {
      const [isPending, setIsPending] = React.useState(false);
      return {
        isPending,
        mutateAsync: async (variables: { id: string; data: unknown }) => {
          setIsPending(true);
          try {
            return await mutateAsync(variables);
          } finally {
            setIsPending(false);
          }
        },
      };
    },
  };
});
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => media.desktop,
}));
vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
  }) => (
    <div
      role="dialog"
      hidden={!open}
      onKeyDown={(event) => {
        if (event.key === "Escape") onOpenChange(false);
      }}
    >
      {children}
      {open && (
        <button type="button" onClick={() => onOpenChange(false)}>
          Dismiss drawer
        </button>
      )}
    </div>
  ),
  DrawerContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DrawerDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/hooks/use-ledger-books", () => ({
  useLedgerBooks: () => ({
    data: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "공용",
        visibility: "shared",
        archivedAt: null,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "개인",
        visibility: "personal",
        archivedAt: null,
      },
    ],
  }),
}));
vi.mock("@/hooks/use-categories", () => ({
  useCategories: (type: string) => ({
    data: [{ id: "category-1", name: "식비", type }],
  }),
}));
vi.mock("@/hooks/use-accounts", () => ({ useAccounts: () => ({ data: [] }) }));
vi.mock("@/hooks/use-payment-methods", () => ({
  usePaymentMethods: () => ({ data: [] }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/components/ledger/LedgerCategoryCombobox", () => ({
  LedgerCategoryCombobox: ({
    onValueChange,
    ...props
  }: ComponentProps<"button"> & { onValueChange: (value: string) => void }) => (
    <button
      type="button"
      role="combobox"
      aria-expanded={false}
      aria-label={props["aria-label"]}
      onClick={() => onValueChange("category-2")}
    >
      category picker
    </button>
  ),
  LedgerCategoryTrigger: (props: React.ComponentProps<"button">) => (
    <button {...props} />
  ),
  LedgerCategoryPickerPanel: () => null,
}));
vi.mock("@/components/ledger/LedgerMoneySourceCombobox", () => ({
  getLedgerMoneySourceLabel: () => "선택",
  LedgerMoneySourceCombobox: ({
    onValueChange,
    ...props
  }: ComponentProps<"button"> & { onValueChange: (value: string) => void }) => (
    <button
      type="button"
      role="combobox"
      aria-expanded={false}
      aria-label={props["aria-label"]}
      onClick={() => onValueChange("pm:new")}
    >
      source picker
    </button>
  ),
  LedgerMoneySourceTrigger: (props: React.ComponentProps<"button">) => (
    <button {...props} />
  ),
  LedgerMoneySourcePickerPanel: () => null,
}));
vi.mock("@/components/ui/date-picker", () => ({
  DatePickerInput: ({
    id,
    value,
    onChange,
  }: {
    id?: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <input
      id={id}
      aria-label="날짜"
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

const entry: LedgerEntryWithDetails = {
  id: "entry-1",
  householdId: "household-1",
  ownerId: "owner-1",
  ownerName: "작성자",
  type: "expense",
  amount: 50000,
  title: "검증식비",
  categoryId: null,
  categoryName: null,
  categoryIcon: null,
  fromAccountId: "old-account",
  fromAccountName: null,
  fromPaymentMethodId: null,
  fromPaymentMethodName: null,
  toAccountId: null,
  toAccountName: null,
  toPaymentMethodId: null,
  toPaymentMethodName: null,
  bookId: "11111111-1111-4111-8111-111111111111",
  isShared: true,
  memo: "과거 기록",
  tags: [{ id: "tag-1", name: "legacy" }],
  transactedAt: "2026-06-02T00:00:00.000Z",
  createdAt: "2026-06-02T00:00:00.000Z",
  updatedAt: "2026-06-02T12:34:56.123456Z",
};

describe("LedgerEntryEditDialog", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });
  beforeEach(() => {
    mutateAsync.mockReset();
    media.desktop = true;
  });
  it("moves an uncategorized historical entry with only book and exact version", async () => {
    mutateAsync.mockResolvedValueOnce({});
    render(<LedgerEntryEditDialog entry={entry} open onOpenChange={vi.fn()} />);
    expect(screen.queryByLabelText(/태그/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("내용 *")).toHaveValue("검증식비");
    fireEvent.click(screen.getByRole("combobox", { name: "장부" }));
    fireEvent.click(await screen.findByRole("option", { name: "개인 · 개인" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(
      await screen.findByRole("heading", {
        name: "개인 장부로 옮길까요?",
      }),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "개인 장부로 이동" }));
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        id: "entry-1",
        data: {
          bookId: "22222222-2222-4222-8222-222222222222",
          confirmVisibilityChange: true,
          expectedUpdatedAt: entry.updatedAt,
        },
      }),
    );
  });

  it("keeps the changed draft and exact version after a visibility-confirmed write is rejected", async () => {
    mutateAsync
      .mockRejectedValueOnce(new ApiQueryError("ENTRY_CHANGED", "충돌", 409))
      .mockResolvedValueOnce({});
    render(
      <LedgerEntryEditDialog
        entry={{ ...entry, categoryId: "category-1" }}
        open
        onOpenChange={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("내용 *"), {
      target: { value: "확인 후에도 남길 내용" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: "장부" }));
    fireEvent.click(await screen.findByRole("option", { name: "개인 · 개인" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "개인 장부로 이동" }),
    );
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("내용 *")).toHaveValue(
      "확인 후에도 남길 내용",
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "개인 장부로 이동" }),
    );
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
    expect(
      mutateAsync.mock.calls.map(([call]) => call.data.expectedUpdatedAt),
    ).toEqual([entry.updatedAt, entry.updatedAt]);
    expect(
      mutateAsync.mock.calls.map(([call]) => call.data.confirmVisibilityChange),
    ).toEqual([true, true]);
    expect(mutateAsync.mock.calls[1]?.[0].data.title).toBe(
      "확인 후에도 남길 내용",
    );
  });

  it("does not ask for confirmation when visibility stays the same", async () => {
    mutateAsync.mockResolvedValueOnce({});
    render(
      <LedgerEntryEditDialog
        entry={{ ...entry, categoryId: "category-1" }}
        open
        onOpenChange={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("내용 *"), {
      target: { value: "제목 수정" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("heading", { name: /공개 범위/ })).toBeNull();
    expect(mutateAsync.mock.calls[0]?.[0].data).not.toHaveProperty(
      "confirmVisibilityChange",
    );
  });

  it.each([true, false])(
    "renders transfer edits in desktop=%s with only book movement fields and confirmed book payload",
    async (desktop) => {
      media.desktop = desktop;
      mutateAsync.mockResolvedValueOnce({});
      const transfer = {
        ...entry,
        type: "transfer",
        fromAccountId: "from-account",
        fromAccountName: "출금 계좌",
        toAccountId: "to-account",
        toAccountName: "입금 계좌",
      } satisfies LedgerEntryWithDetails;
      render(
        <LedgerEntryEditDialog entry={transfer} open onOpenChange={vi.fn()} />,
      );
      expect(
        screen.getByText(/내부이체는 장부만 변경할 수 있습니다/),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("combobox", { name: "장부" }),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText("금액 *")).toBeNull();
      expect(screen.queryByLabelText("내용 *")).toBeNull();
      fireEvent.click(screen.getByRole("combobox", { name: "장부" }));
      fireEvent.click(
        await screen.findByRole("option", { name: "개인 · 개인" }),
      );
      fireEvent.click(screen.getByRole("button", { name: "저장" }));
      fireEvent.click(
        await screen.findByRole("button", { name: "개인 장부로 이동" }),
      );
      await waitFor(() =>
        expect(mutateAsync).toHaveBeenCalledWith({
          id: "entry-1",
          data: {
            bookId: "22222222-2222-4222-8222-222222222222",
            confirmVisibilityChange: true,
            expectedUpdatedAt: entry.updatedAt,
          },
        }),
      );
    },
  );

  it("keeps edited draft and original version after a conflict refetch", async () => {
    mutateAsync.mockRejectedValueOnce(
      new ApiQueryError("ENTRY_CHANGED", "기록이 변경되었습니다.", 409),
    );
    const view = render(
      <LedgerEntryEditDialog
        entry={{ ...entry, categoryId: "category-1" }}
        open
        onOpenChange={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("내용 *"), {
      target: { value: "수정 중인 제목" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    view.rerender(
      <LedgerEntryEditDialog
        entry={{
          ...entry,
          categoryId: "category-1",
          updatedAt: "2026-06-02T12:35:00.000Z",
        }}
        open
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("내용 *")).toHaveValue("수정 중인 제목");
    expect(mutateAsync.mock.calls[0]?.[0].data.expectedUpdatedAt).toBe(
      entry.updatedAt,
    );
  });

  it.each([true, false])(
    "shows a single 기록 수정 heading on desktop=%s",
    (desktop) => {
      media.desktop = desktop;
      render(
        <LedgerEntryEditDialog entry={entry} open onOpenChange={vi.fn()} />,
      );
      expect(
        screen.getAllByRole("heading", { name: "기록 수정" }),
      ).toHaveLength(1);
    },
  );

  it("asks before discarding a dirty draft and keeps it when continuing", async () => {
    const onOpenChange = vi.fn();
    render(
      <LedgerEntryEditDialog
        entry={{ ...entry, categoryId: "category-1" }}
        open
        onOpenChange={onOpenChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("내용 *"), {
      target: { value: "수정 중인 제목" },
    });
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(
      await screen.findByRole("heading", { name: "수정한 내용을 버릴까요?" }),
    ).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "계속 수정" }));
    expect(screen.getByLabelText("내용 *")).toHaveValue("수정 중인 제목");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    "guards cancel, close, and Escape on desktop=%s",
    (desktop) => {
      media.desktop = desktop;
      for (const action of ["취소", "close", "Escape"] as const) {
        const onOpenChange = vi.fn();
        const view = render(
          <LedgerEntryEditDialog
            entry={{ ...entry, categoryId: "category-1" }}
            open
            onOpenChange={onOpenChange}
          />,
        );
        fireEvent.change(screen.getByLabelText("내용 *"), {
          target: { value: `수정 ${action}` },
        });
        if (action === "취소")
          fireEvent.click(screen.getByRole("button", { name: "취소" }));
        else if (action === "close") {
          fireEvent.click(
            screen.getByRole("button", {
              name: desktop ? "Close" : "기록 수정 닫기",
            }),
          );
        } else
          fireEvent.keyDown(screen.getByLabelText("내용 *"), { key: "Escape" });
        expect(
          screen.getByRole("heading", { name: "수정한 내용을 버릴까요?" }),
        ).toBeInTheDocument();
        expect(onOpenChange).not.toHaveBeenCalled();
        view.unmount();
      }
    },
  );

  it.each(["category", "source", "date"] as const)(
    "treats a %s-only edit as dirty",
    (field) => {
      media.desktop = true;
      const onOpenChange = vi.fn();
      render(
        <LedgerEntryEditDialog
          entry={{ ...entry, categoryId: "category-1" }}
          open
          onOpenChange={onOpenChange}
        />,
      );
      if (field === "category")
        fireEvent.click(screen.getByRole("combobox", { name: "카테고리" }));
      if (field === "source")
        fireEvent.click(screen.getByRole("combobox", { name: "결제 방법" }));
      if (field === "date")
        fireEvent.change(screen.getByLabelText("날짜"), {
          target: { value: "2026-06-03" },
        });
      fireEvent.click(screen.getByRole("button", { name: "취소" }));
      expect(
        screen.getByRole("heading", { name: "수정한 내용을 버릴까요?" }),
      ).toBeInTheDocument();
      expect(onOpenChange).not.toHaveBeenCalled();
    },
  );

  it("keeps visibility confirmation and dismissal disabled while its mutation is pending", async () => {
    let resolveMutation: (() => void) | undefined;
    mutateAsync.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveMutation = () => resolve({});
      }),
    );
    const onOpenChange = vi.fn();
    render(
      <LedgerEntryEditDialog entry={entry} open onOpenChange={onOpenChange} />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: "장부" }));
    fireEvent.click(await screen.findByRole("option", { name: "개인 · 개인" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    const confirm = await screen.findByRole("button", {
      name: "개인 장부로 이동",
    });
    fireEvent.click(confirm);
    await waitFor(() => expect(confirm).toBeDisabled());
    expect(screen.getByRole("button", { name: "계속 수정" })).toBeDisabled();
    fireEvent.keyDown(confirm, { key: "Escape" });
    expect(
      screen.getByRole("heading", { name: "개인 장부로 옮길까요?" }),
    ).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    resolveMutation?.();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
