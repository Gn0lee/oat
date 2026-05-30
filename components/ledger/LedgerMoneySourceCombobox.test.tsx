import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LedgerMoneySourceCombobox } from "./LedgerMoneySourceCombobox";

vi.mock("@/hooks/use-accounts", () => ({
  useCreateAccount: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-payment-methods", () => ({
  useCreatePaymentMethod: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView = () => undefined;
});

describe("LedgerMoneySourceCombobox", () => {
  it("trigger를 클릭하면 Command 검색 입력을 연다", async () => {
    const user = userEvent.setup();

    render(
      <LedgerMoneySourceCombobox
        mode="expense"
        value=""
        paymentMethods={[
          {
            id: "pm-1",
            name: "현대카드",
            ownerName: "진호",
            type: "credit_card",
            issuer: "현대카드",
            lastFour: "1234",
          },
        ]}
        accounts={[]}
        placeholder="선택 안함"
        onValueChange={() => undefined}
      />,
    );

    await user.click(screen.getByRole("combobox"));

    expect(
      screen.getByPlaceholderText("이름, 기관, 소유자 검색"),
    ).toBeInTheDocument();
  });

  it("지출 검색어가 있으면 새 결제 방법 추가 dialog에서 생성 대상을 고른다", async () => {
    const user = userEvent.setup();

    render(
      <LedgerMoneySourceCombobox
        mode="expense"
        value=""
        paymentMethods={[]}
        accounts={[]}
        placeholder="선택 안함"
        onValueChange={() => undefined}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    await user.type(
      screen.getByPlaceholderText("이름, 기관, 소유자 검색"),
      "토스",
    );
    await user.click(
      screen.getAllByRole("button", {
        name: '"토스" 새 결제 방법 추가',
      })[0],
    );

    expect(
      screen.getByRole("dialog", { name: "무엇을 추가할까요?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "신용카드" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "체크카드" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "계좌" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "체크카드" }));

    expect(
      screen.getByRole("dialog", { name: "새 체크카드" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("결제수단명")).toHaveValue("토스");
  });
});
