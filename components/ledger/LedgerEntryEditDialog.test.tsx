import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { LedgerEntryEditDialog } from "./LedgerEntryEditDialog";

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock("@/hooks/use-ledger-entries", () => ({
  useUpdateLedgerEntry: () => ({ mutateAsync, isPending: false }),
}));
vi.mock("@/hooks/use-media-query", () => ({ useMediaQuery: () => true }));
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
  useCategories: () => ({
    data: [{ id: "category-1", name: "식비", type: "expense" }],
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
  LedgerCategoryCombobox: () => <button type="button">category picker</button>,
  LedgerCategoryTrigger: (props: React.ComponentProps<"button">) => (
    <button {...props} />
  ),
  LedgerCategoryPickerPanel: () => null,
}));
vi.mock("@/components/ledger/LedgerMoneySourceCombobox", () => ({
  getLedgerMoneySourceLabel: () => "선택",
  LedgerMoneySourceCombobox: () => <button type="button">source picker</button>,
  LedgerMoneySourceTrigger: (props: React.ComponentProps<"button">) => (
    <button {...props} />
  ),
  LedgerMoneySourcePickerPanel: () => null,
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
        name: "기록 공개 범위를 바꿀까요?",
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "범위 변경 저장" }));
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        id: "entry-1",
        data: {
          bookId: "22222222-2222-4222-8222-222222222222",
          expectedUpdatedAt: entry.updatedAt,
        },
      }),
    );
  });

  it("keeps edited draft and original version after a conflict refetch", async () => {
    mutateAsync.mockRejectedValueOnce(new Error("ENTRY_CHANGED"));
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
});
