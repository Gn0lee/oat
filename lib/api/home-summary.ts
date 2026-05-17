import type {
  LedgerStatsByCategoryResult,
  LedgerStatsSummary,
} from "./ledger-stats";
import type { PortfolioSummary } from "./portfolio";

export interface HomeSummary {
  year: number;
  month: number;
  userName: string;
  cashFlow: LedgerStatsSummary;
  portfolio: PortfolioSummary;
  topCategories: LedgerStatsByCategoryResult;
  ledgerActivity: {
    hasRecentOwnLedgerActivity: boolean;
    lastOwnLedgerEntryCreatedAt: string | null;
  };
}

const DEFAULT_CASH_FLOW: LedgerStatsSummary = {
  year: 0,
  month: 0,
  totalIncome: 0,
  totalSharedExpense: 0,
  totalPersonalExpense: 0,
  totalExpense: 0,
  balance: 0,
  savingsRate: 0,
};

const DEFAULT_PORTFOLIO: PortfolioSummary = {
  holdingCount: 0,
  totalValue: 0,
  totalInvested: 0,
  returnRate: 0,
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
  portfolio: PortfolioSummary | null,
  topCategories: LedgerStatsByCategoryResult | null = null,
  ledgerActivity: HomeSummary["ledgerActivity"] | null = null,
  userName = "사용자",
): HomeSummary {
  const cf = cashFlow ?? DEFAULT_CASH_FLOW;
  const pt = portfolio ?? DEFAULT_PORTFOLIO;

  return {
    year: cf.year,
    month: cf.month,
    userName,
    cashFlow: cf,
    portfolio: pt,
    topCategories: topCategories ?? DEFAULT_TOP_CATEGORIES,
    ledgerActivity: ledgerActivity ?? DEFAULT_LEDGER_ACTIVITY,
  };
}
