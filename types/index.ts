export type { Database, Json } from "./database";

// 자산 유형
export type AssetClass = "equity" | "bond" | "cash" | "alternative";

// 거래 유형
export type TransactionType = "buy" | "sell";

// 위험도
export type RiskLevel = "low" | "medium" | "high";

// 통화
export type Currency = "KRW" | "USD";

// 보유 자산 (View에서 조회)
export interface Holding {
  id: string;
  memberId: string;
  memberName: string;
  stockSymbol: string;
  stockName: string;
  quantity: number;
  avgPrice: number;
  currency: Currency;
  assetClass: AssetClass;
  riskLevel: RiskLevel;
}

// 거래 내역
export interface Transaction {
  id: string;
  memberId: string;
  stockSymbol: string;
  stockName: string;
  type: TransactionType;
  quantity: number;
  price: number;
  currency: Currency;
  transactionDate: string;
  createdAt: string;
}

// 대시보드 요약
export interface DashboardSummary {
  totalValue: number;
  totalInvested: number;
  totalReturn: number;
  returnRate: number;
  byMember: MemberSummary[];
  byAssetClass: AssetClassSummary[];
}

export interface MemberSummary {
  memberId: string;
  memberName: string;
  totalValue: number;
  percentage: number;
}

export interface AssetClassSummary {
  assetClass: AssetClass;
  totalValue: number;
  percentage: number;
}
