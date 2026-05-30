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
        name: "키움증권",
        broker: "키움",
        accountType: "stock",
        category: "investment",
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
});
