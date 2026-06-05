import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddTransferStep } from "./AddTransferStep";

vi.mock("@/hooks/use-accounts", () => ({
  useAccounts: () => ({
    data: [
      {
        id: "account-1",
        ownerId: "user-1",
        ownerName: "사용자",
        name: "토스뱅크",
        broker: "토스뱅크",
        lastFour: null,
        accountType: "checking",
        category: "bank",
        balance: 10_000,
      },
      {
        id: "account-2",
        ownerId: "user-1",
        ownerName: "사용자",
        name: "카카오뱅크",
        broker: "카카오뱅크",
        lastFour: null,
        accountType: "checking",
        category: "bank",
        balance: 100_000,
      },
    ],
  }),
}));

vi.mock("@/hooks/use-payment-methods", () => ({
  usePaymentMethods: () => ({ data: [] }),
}));

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUserId: () => ({ userId: "user-1" }),
}));

vi.mock("@/components/ledger/LedgerMoneySourceCombobox", () => ({
  LedgerMoneySourceCombobox: ({
    value,
    accounts,
    placeholder,
    onValueChange,
  }: {
    value: string;
    accounts: Array<{ id: string; name: string }>;
    placeholder: string;
    onValueChange: (value: string) => void;
  }) => (
    <select
      aria-label={placeholder}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value="">선택</option>
      {accounts.map((account) => (
        <option key={account.id} value={`acc:${account.id}`}>
          {account.name}
        </option>
      ))}
    </select>
  ),
}));

describe("AddTransferStep", () => {
  it("이체 입력 라벨을 쉬운 돈 위치 표현으로 보여준다", () => {
    render(<AddTransferStep onNext={vi.fn()} />);

    expect(screen.getByText("어디에서 *")).toBeInTheDocument();
    expect(screen.getByText("어디로 *")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("예: 카카오페이 충전, 증권 계좌 입금"),
    ).toBeInTheDocument();
  });

  it("저장 후 잔액이 음수가 되면 확인 후 제출한다", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<AddTransferStep onNext={onNext} submitLabel="저장" />);

    await user.type(screen.getByPlaceholderText("0"), "20000");
    await user.type(
      screen.getByPlaceholderText("예: 카카오페이 충전, 증권 계좌 입금"),
      "카카오페이 충전",
    );

    const selectors = screen.getAllByRole("combobox");
    await user.selectOptions(selectors[0], "acc:account-1");
    await user.selectOptions(selectors[1], "acc:account-2");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByText("잔액이 음수가 됩니다")).toBeInTheDocument();
    expect(
      screen.getByText(/저장하면 토스뱅크 잔액이 -₩10,000이 됩니다/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "그래도 저장" }));

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "20000",
        title: "카카오페이 충전",
        from: { kind: "account", id: "account-1" },
        to: { kind: "account", id: "account-2" },
      }),
    );
  });
});
