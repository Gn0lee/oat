import type {
  LedgerFlowSummary,
  LedgerStatsByCategoryResult,
  LedgerStatsSummary,
} from "./ledger-stats";

export interface HomeAssetSummary {
  holdingCount: number;
  totalInvested: number;
}

export interface HomeSummary {
  year: number;
  month: number;
  userName: string;
  cashFlow: LedgerStatsSummary;
  assets: HomeAssetSummary;
  topCategories: LedgerStatsByCategoryResult;
  ledgerActivity: {
    hasRecentOwnLedgerActivity: boolean;
    lastOwnLedgerEntryCreatedAt: string | null;
  };
}

const DEFAULT_FLOW: LedgerFlowSummary = {
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
  savingsRate: 0,
};

const DEFAULT_CASH_FLOW: LedgerStatsSummary = {
  year: 0,
  month: 0,
  shared: DEFAULT_FLOW,
  personal: DEFAULT_FLOW,
};

const DEFAULT_ASSETS: HomeAssetSummary = {
  holdingCount: 0,
  totalInvested: 0,
};

const DEFAULT_TOP_CATEGORIES: LedgerStatsByCategoryResult = {
  type: "expense",
  scope: "shared",
  total: 0,
  items: [],
};

const DEFAULT_LEDGER_ACTIVITY = {
  hasRecentOwnLedgerActivity: false,
  lastOwnLedgerEntryCreatedAt: null,
};

export function calcSavingsRate(income: number, expense: number): number {
  if (income === 0) return 0;
  return Math.round(((income - expense) / income) * 100);
}

export function buildHomeSummary(
  cashFlow: LedgerStatsSummary | null,
  assets: HomeAssetSummary | null,
  topCategories: LedgerStatsByCategoryResult | null = null,
  ledgerActivity: HomeSummary["ledgerActivity"] | null = null,
  userName = "사용자",
): HomeSummary {
  const cf = cashFlow ?? DEFAULT_CASH_FLOW;

  return {
    year: cf.year,
    month: cf.month,
    userName,
    cashFlow: cf,
    assets: assets ?? DEFAULT_ASSETS,
    topCategories: topCategories ?? DEFAULT_TOP_CATEGORIES,
    ledgerActivity: ledgerActivity ?? DEFAULT_LEDGER_ACTIVITY,
  };
}
