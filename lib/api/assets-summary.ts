import type { PortfolioSummary } from "./portfolio";

export interface AssetsSummary {
  portfolio: PortfolioSummary;
  accountCount: number;
}

const DEFAULT_PORTFOLIO: PortfolioSummary = {
  holdingCount: 0,
  totalValue: 0,
  totalInvested: 0,
  returnRate: 0,
};

export function buildAssetsSummary(
  portfolio: PortfolioSummary | null,
  accountCount: number,
): AssetsSummary {
  return {
    portfolio: portfolio ?? DEFAULT_PORTFOLIO,
    accountCount,
  };
}
