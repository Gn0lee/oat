import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { ComposerFormStep } from "./ComposerFormStep";
import type { LedgerComposerFormValues } from "./LedgerEntryComposer";

vi.mock("@/hooks/use-media-query", () => ({ useMediaQuery: () => false }));
vi.mock("@/hooks/use-categories", () => ({
  useCategories: () => ({ data: [{ id: "food", name: "식비" }] }),
}));
vi.mock("@/hooks/use-payment-methods", () => ({
  usePaymentMethods: () => ({ data: [] }),
}));
vi.mock("@/hooks/use-accounts", () => ({
  useAccounts: () => ({ data: [] }),
}));
vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUserId: () => ({ userId: "user-1" }),
}));
vi.mock("@/hooks/use-ledger-tags", () => ({
  useLedgerTags: () => ({ data: [] }),
}));
vi.mock("@/components/ledger/LedgerCategoryCombobox", () => ({
  LedgerCategoryCombobox: () => null,
  LedgerCategoryTrigger: ({
    label,
    onClick,
  }: {
    label: string;
    onClick: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
  LedgerCategoryPickerPanel: ({
    onValueChange,
  }: {
    onValueChange: (value: string) => void;
  }) => (
    <button type="button" onClick={() => onValueChange("food")}>
      식비 선택
    </button>
  ),
}));
vi.mock("@/components/ledger/LedgerMoneySourceCombobox", () => ({
  getLedgerMoneySourceLabel: () => "선택 안함",
  LedgerMoneySourceCombobox: () => null,
  LedgerMoneySourcePickerPanel: () => null,
  LedgerMoneySourceTrigger: () => null,
}));
vi.mock("@/components/ledger/LedgerTitleCombobox", () => ({
  LedgerTitleCombobox: ({
    value,
    onValueChange,
  }: {
    value: string;
    onValueChange: (value: string) => void;
  }) => (
    <input
      aria-label="내용 입력"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
}));
vi.mock("@/components/ledger/LedgerTagInput", () => ({
  LedgerTagInput: () => null,
}));
vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? children : null,
  DrawerContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

function Form() {
  const form = useForm<LedgerComposerFormValues>({
    defaultValues: {
      defaultType: "expense",
      defaultIsShared: true,
      defaultDate: "2026-09-17",
      items: [
        {
          type: "expense",
          isShared: true,
          amount: "",
          title: "",
          categoryId: "",
          transactedAt: "2026-09-17",
        },
      ],
    },
  });
  return (
    <FormProvider {...form}>
      <ComposerFormStep index={0} mode="daily" onBack={() => undefined} />
    </FormProvider>
  );
}

describe("ComposerFormStep", () => {
  it("preserves fields and scroll on picker return, with 완료 outside the scrollable fields", () => {
    const { container } = render(<Form />);
    const fields = container.querySelector(".overflow-y-auto") as HTMLElement;
    fields.scrollTop = 120;

    fireEvent.change(screen.getByPlaceholderText("0"), {
      target: { value: "1234" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "내용 입력" }), {
      target: { value: "점심" },
    });
    fireEvent.click(screen.getByRole("button", { name: "선택" }));
    fireEvent.click(screen.getByRole("button", { name: "식비 선택" }));

    expect(screen.getByPlaceholderText("0")).toHaveValue(1234);
    expect(screen.getByRole("textbox", { name: "내용 입력" })).toHaveValue(
      "점심",
    );
    expect(screen.getByRole("button", { name: "식비" })).toBeInTheDocument();
    expect(fields.scrollTop).toBe(120);
    const action = screen.getByRole("button", { name: "완료" });
    expect(fields).not.toContainElement(action);
    expect(action.parentElement).toHaveClass("shrink-0");
  });
});
