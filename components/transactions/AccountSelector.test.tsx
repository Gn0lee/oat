import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { AccountSelector } from "./AccountSelector";

vi.mock("@/hooks/use-accounts", () => ({
  useAccounts: () => ({
    data: [
      {
        id: "account-1",
        householdId: "household-1",
        ownerId: "owner-1",
        ownerName: "홍길동",
        name: "키움증권",
        broker: "키움",
        lastFour: "1234",
        accountType: "stock",
        category: "investment",
        balance: null,
        balanceUpdatedAt: null,
        memo: null,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ],
    isLoading: false,
  }),
  useCreateAccount: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => true,
}));

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView = () => undefined;
});

function AccountSelectorHarness() {
  const form = useForm<{ accountId?: string }>({
    defaultValues: { accountId: undefined },
  });

  return (
    <FormProvider {...form}>
      <AccountSelector control={form.control} variant="inline" />
    </FormProvider>
  );
}

describe("AccountSelector", () => {
  it("검색어가 있으면 새 투자 계좌 추가 dialog를 열 수 있다", async () => {
    const user = userEvent.setup();

    render(<AccountSelectorHarness />);

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("계좌명, 증권사 검색"), "토스");
    await user.click(
      screen.getAllByRole("button", {
        name: '"토스" 새 투자 계좌 추가',
      })[0],
    );

    expect(
      screen.getByRole("dialog", { name: "새 투자 계좌" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("계좌명")).toHaveValue("토스");
  });

  it("계좌 선택 목록에 마지막 4자리와 소유자를 표시한다", async () => {
    const user = userEvent.setup();

    render(<AccountSelectorHarness />);

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByText("키움증권 (1234)")).toBeInTheDocument();
    expect(screen.getByText("키움 · 소유자: 홍길동")).toBeInTheDocument();
  });
});
