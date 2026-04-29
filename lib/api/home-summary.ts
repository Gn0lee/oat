import type { LedgerStatsSummary } from "./ledger-stats";
import type { PortfolioSummary } from "./portfolio";

export interface HomeSummary {
  year: number;
  month: number;
  cashFlow: LedgerStatsSummary;
  portfolio: PortfolioSummary;
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

export function calcSavingsRate(income: number, expense: number): number {
  if (income === 0) return 0;
  return Math.round(((income - expense) / income) * 100);
}

export function buildHomeSummary(
  cashFlow: LedgerStatsSummary | null,
  portfolio: PortfolioSummary | null,
): HomeSummary {
  const cf = cashFlow ?? DEFAULT_CASH_FLOW;
  const pt = portfolio ?? DEFAULT_PORTFOLIO;

  return {
    year: cf.year,
    month: cf.month,
    cashFlow: cf,
    portfolio: pt,
  };
}
