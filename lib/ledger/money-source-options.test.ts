import { describe, expect, it } from "vitest";
import {
  buildLedgerMoneySourceGroups,
  getLedgerMoneySourceValue,
  type LedgerMoneySourceAccount,
  type LedgerMoneySourcePaymentMethod,
} from "./money-source-options";

const bankAccount: LedgerMoneySourceAccount = {
  id: "bank-1",
  name: "국민은행 생활비",
  ownerName: "진호",
  broker: "국민은행",
  lastFour: "1222",
  accountType: "checking",
  category: "bank",
};

const legacyBankAccount: LedgerMoneySourceAccount = {
  id: "legacy-bank-1",
  name: "신한 적금",
  ownerName: "진호",
  broker: "신한은행",
  lastFour: null,
  accountType: "savings",
  category: null,
};

const investmentAccount: LedgerMoneySourceAccount = {
  id: "investment-1",
  name: "토스증권",
  ownerName: "수진",
  broker: "토스증권",
  lastFour: "3444",
  accountType: "stock",
  category: "investment",
};

const legacyInvestmentAccount: LedgerMoneySourceAccount = {
  id: "legacy-investment-1",
  name: "ISA 계좌",
  ownerName: "수진",
  broker: "미래에셋",
  lastFour: null,
  accountType: "isa",
  category: null,
};

const creditCard: LedgerMoneySourcePaymentMethod = {
  id: "pm-card-1",
  name: "현대카드",
  ownerName: "진호",
  type: "credit_card",
  issuer: "현대카드",
  lastFour: "1234",
};

const cash: LedgerMoneySourcePaymentMethod = {
  id: "pm-cash-1",
  name: "현금",
  ownerName: "수진",
  type: "cash",
  issuer: null,
  lastFour: null,
};

const paymentMethods = [creditCard, cash];
const accounts = [
  bankAccount,
  legacyBankAccount,
  investmentAccount,
  legacyInvestmentAccount,
];

describe("buildLedgerMoneySourceGroups", () => {
  it("지출은 결제수단과 은행 계좌만 보여준다", () => {
    const groups = buildLedgerMoneySourceGroups({
      mode: "expense",
      paymentMethods,
      accounts,
      includeClearOption: true,
    });

    expect(groups.map((group) => group.label)).toEqual([
      "선택",
      "결제수단",
      "은행 계좌",
    ]);
    expect(
      groups.flatMap((group) => group.options.map((option) => option.id)),
    ).toEqual(["none", "pm-card-1", "pm-cash-1", "bank-1", "legacy-bank-1"]);
  });

  it("수입은 은행 계좌와 투자 계좌를 보여준다", () => {
    const groups = buildLedgerMoneySourceGroups({
      mode: "income",
      paymentMethods,
      accounts,
      includeClearOption: false,
    });

    expect(groups.map((group) => group.label)).toEqual([
      "은행 계좌",
      "투자 계좌",
    ]);
    expect(
      groups.flatMap((group) => group.options.map((option) => option.id)),
    ).toEqual([
      "bank-1",
      "legacy-bank-1",
      "investment-1",
      "legacy-investment-1",
    ]);
  });

  it("이체는 은행 계좌, 투자 계좌, 이체 가능한 결제수단만 보여준다", () => {
    const groups = buildLedgerMoneySourceGroups({
      mode: "transfer",
      paymentMethods,
      accounts,
      includeClearOption: false,
    });

    expect(groups.map((group) => group.label)).toEqual([
      "은행 계좌",
      "투자 계좌",
      "선불/상품권/현금",
    ]);
    expect(
      groups.flatMap((group) => group.options.map((option) => option.id)),
    ).toEqual([
      "bank-1",
      "legacy-bank-1",
      "investment-1",
      "legacy-investment-1",
      "pm-cash-1",
    ]);
  });
});

describe("getLedgerMoneySourceValue", () => {
  it("결제수단과 계좌 선택값을 prefix 기반으로 만든다", () => {
    expect(getLedgerMoneySourceValue({ paymentMethodId: "pm-1" })).toBe(
      "pm:pm-1",
    );
    expect(getLedgerMoneySourceValue({ accountId: "acc-1" })).toBe("acc:acc-1");
    expect(getLedgerMoneySourceValue({})).toBe("");
  });
});
