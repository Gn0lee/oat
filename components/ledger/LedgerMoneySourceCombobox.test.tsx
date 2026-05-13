import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import { LedgerMoneySourceCombobox } from "./LedgerMoneySourceCombobox";

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
});
