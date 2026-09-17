import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LedgerCategoryPickerPanel } from "@/components/ledger/LedgerCategoryCombobox";
import { LedgerMoneySourcePickerPanel } from "@/components/ledger/LedgerMoneySourceCombobox";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

vi.mock("@/hooks/use-categories", () => ({
  useCreateCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/use-accounts", () => ({
  useCreateAccount: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/use-payment-methods", () => ({
  useCreatePaymentMethod: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView = () => undefined;
});

describe("ledger composer pickers", () => {
  it("announces the category picker", async () => {
    render(
      <Drawer open>
        <DrawerContent>
          <LedgerCategoryPickerPanel
            value=""
            categories={[]}
            title="카테고리 선택"
            searchPlaceholder="카테고리 검색"
            onValueChange={() => undefined}
          />
        </DrawerContent>
      </Drawer>,
    );
    expect(
      await screen.findByRole("dialog", { name: "카테고리 선택" }),
    ).toBeInTheDocument();
  });

  it("announces the money source picker", async () => {
    render(
      <Drawer open>
        <DrawerContent>
          <LedgerMoneySourcePickerPanel
            mode="expense"
            value=""
            paymentMethods={[]}
            accounts={[]}
            title="결제 방법 선택"
            searchPlaceholder="결제 방법 검색"
            onValueChange={() => undefined}
          />
        </DrawerContent>
      </Drawer>,
    );
    expect(
      await screen.findByRole("dialog", { name: "결제 방법 선택" }),
    ).toBeInTheDocument();
  });
});
