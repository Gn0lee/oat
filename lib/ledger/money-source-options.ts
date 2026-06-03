import type { AccountCategory, AccountType, PaymentMethodType } from "@/types";

export type LedgerMoneySourceMode = "expense" | "income" | "transfer";
export type LedgerMoneySourceKind = "none" | "paymentMethod" | "account";

export interface LedgerMoneySourcePaymentMethod {
  id: string;
  name: string;
  ownerId?: string;
  ownerName: string;
  type: PaymentMethodType;
  issuer: string | null;
  lastFour: string | null;
}

export interface LedgerMoneySourceAccount {
  id: string;
  name: string;
  ownerId?: string;
  ownerName: string;
  broker: string | null;
  lastFour: string | null;
  accountType: AccountType | null;
  category: AccountCategory | null;
}

export interface LedgerMoneySourceOption {
  id: string;
  value: string;
  kind: LedgerMoneySourceKind;
  label: string;
  description: string | null;
  searchValue: string;
}

export interface LedgerMoneySourceGroup {
  label: string;
  options: LedgerMoneySourceOption[];
}

interface BuildLedgerMoneySourceGroupsParams {
  mode: LedgerMoneySourceMode;
  paymentMethods: LedgerMoneySourcePaymentMethod[];
  accounts: LedgerMoneySourceAccount[];
  includeClearOption?: boolean;
}

interface GetLedgerMoneySourceValueParams {
  paymentMethodId?: string | null;
  accountId?: string | null;
}

const BANK_ACCOUNT_TYPES = new Set<AccountType>([
  "checking",
  "savings",
  "deposit",
]);

const INVESTMENT_ACCOUNT_TYPES = new Set<AccountType>([
  "stock",
  "isa",
  "pension",
  "cma",
]);

const TRANSFER_CAPABLE_PAYMENT_METHOD_TYPES = new Set<PaymentMethodType>([
  "prepaid",
  "gift_card",
  "cash",
]);

function compactSearchText(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function getAccountCategory(
  account: LedgerMoneySourceAccount,
): AccountCategory | null {
  if (account.category) return account.category;
  if (account.accountType && BANK_ACCOUNT_TYPES.has(account.accountType)) {
    return "bank";
  }
  if (
    account.accountType &&
    INVESTMENT_ACCOUNT_TYPES.has(account.accountType)
  ) {
    return "investment";
  }
  return null;
}

function toPaymentMethodOption(
  paymentMethod: LedgerMoneySourcePaymentMethod,
): LedgerMoneySourceOption {
  const description = compactSearchText([
    paymentMethod.issuer,
    paymentMethod.ownerName,
    paymentMethod.lastFour ? `끝 ${paymentMethod.lastFour}` : null,
  ]);

  return {
    id: paymentMethod.id,
    value: `pm:${paymentMethod.id}`,
    kind: "paymentMethod",
    label: paymentMethod.name,
    description: description || null,
    searchValue: compactSearchText([
      paymentMethod.name,
      paymentMethod.issuer,
      paymentMethod.ownerName,
      paymentMethod.lastFour,
      "결제수단",
    ]),
  };
}

function toAccountOption(
  account: LedgerMoneySourceAccount,
  groupLabel: string,
): LedgerMoneySourceOption {
  const description = compactSearchText([
    account.broker,
    account.ownerName,
    account.lastFour ? `끝 ${account.lastFour}` : null,
  ]);

  return {
    id: account.id,
    value: `acc:${account.id}`,
    kind: "account",
    label: account.name,
    description: description || null,
    searchValue: compactSearchText([
      account.name,
      account.broker,
      account.ownerName,
      account.lastFour,
      groupLabel,
    ]),
  };
}

export function getLedgerMoneySourceValue({
  paymentMethodId,
  accountId,
}: GetLedgerMoneySourceValueParams): string {
  if (paymentMethodId) return `pm:${paymentMethodId}`;
  if (accountId) return `acc:${accountId}`;
  return "";
}

export function buildLedgerMoneySourceGroups({
  mode,
  paymentMethods,
  accounts,
  includeClearOption = false,
}: BuildLedgerMoneySourceGroupsParams): LedgerMoneySourceGroup[] {
  const bankAccounts = accounts.filter(
    (account) => getAccountCategory(account) === "bank",
  );
  const investmentAccounts = accounts.filter(
    (account) => getAccountCategory(account) === "investment",
  );
  const transferCapablePaymentMethods = paymentMethods.filter((paymentMethod) =>
    TRANSFER_CAPABLE_PAYMENT_METHOD_TYPES.has(paymentMethod.type),
  );

  const groups: LedgerMoneySourceGroup[] = [];

  if (includeClearOption) {
    groups.push({
      label: "선택",
      options: [
        {
          id: "none",
          value: "",
          kind: "none",
          label: "선택 안함",
          description: null,
          searchValue: "선택 안함 없음 비우기",
        },
      ],
    });
  }

  if (mode === "expense" && paymentMethods.length > 0) {
    groups.push({
      label: "결제수단",
      options: paymentMethods.map(toPaymentMethodOption),
    });
  }

  if (bankAccounts.length > 0) {
    groups.push({
      label: "은행 계좌",
      options: bankAccounts.map((account) =>
        toAccountOption(account, "은행 계좌"),
      ),
    });
  }

  if (
    (mode === "income" || mode === "transfer") &&
    investmentAccounts.length > 0
  ) {
    groups.push({
      label: "투자 계좌",
      options: investmentAccounts.map((account) =>
        toAccountOption(account, "투자 계좌"),
      ),
    });
  }

  if (mode === "transfer" && transferCapablePaymentMethods.length > 0) {
    groups.push({
      label: "선불/상품권/현금",
      options: transferCapablePaymentMethods.map(toPaymentMethodOption),
    });
  }

  return groups;
}
