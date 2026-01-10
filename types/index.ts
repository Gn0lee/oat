// Supabase 자동 생성 타입
import type {
  Enums,
  Database as SupabaseDatabase,
  Json as SupabaseJson,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./supabase";

// 기본 타입 re-export
export type Database = SupabaseDatabase;
export type Json = SupabaseJson;

// Supabase Enum 타입 (편의를 위해)
export type AccountType = Enums<"account_type">;
export type AssetType = Enums<"asset_type">;
export type CurrencyType = Enums<"currency_type">;
export type MarketType = Enums<"market_type">;
export type RiskLevel = Enums<"risk_level">;
export type TransactionType = Enums<"transaction_type">;
export type HouseholdRole = Enums<"household_role">;
export type UserRole = Enums<"user_role">;
export type AllocationCategory = Enums<"allocation_category">;

// 테이블 Row 타입 (편의를 위해)
export type Account = Tables<"accounts">;
export type Profile = Tables<"profiles">;
export type Household = Tables<"households">;
export type HouseholdMember = Tables<"household_members">;
export type Invitation = Tables<"invitations">;
export type Transaction = Tables<"transactions">;
export type HouseholdStockSetting = Tables<"household_stock_settings">;
export type StockMaster = Tables<"stock_master">;
export type ExchangeRate = Tables<"exchange_rates">;
export type Tag = Tables<"tags">;
export type HoldingTag = Tables<"holding_tags">;
export type TargetAllocation = Tables<"target_allocations">;

// View 타입
export type Holding = Tables<"holdings">;

// 시스템 테이블 타입
export type StockPrice = Tables<"stock_prices">;

// Insert 타입 (편의를 위해)
export type AccountInsert = TablesInsert<"accounts">;
export type TransactionInsert = TablesInsert<"transactions">;
export type HouseholdStockSettingInsert =
  TablesInsert<"household_stock_settings">;
export type TagInsert = TablesInsert<"tags">;
export type HoldingTagInsert = TablesInsert<"holding_tags">;

// Update 타입 (편의를 위해)
export type AccountUpdate = TablesUpdate<"accounts">;
export type TransactionUpdate = TablesUpdate<"transactions">;
export type HouseholdStockSettingUpdate =
  TablesUpdate<"household_stock_settings">;

// 대시보드 요약 (프론트엔드용)
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
  totalInvested: number;
  totalReturn: number;
  returnRate: number;
  percentage: number;
}

export interface AssetClassSummary {
  assetClass: AssetType;
  totalValue: number;
  percentage: number;
}

// 주식 분석 페이지용 타입
export interface StockAnalysisData {
  summary: StockAnalysisSummary;
  holdings: StockHoldingWithReturn[];
  byMarket: MarketBreakdown[];
  byCurrency: CurrencyBreakdown[];
  exchangeRate: number;
}

export interface StockAnalysisSummary {
  totalValue: number;
  totalInvested: number;
  totalReturn: number;
  returnRate: number;
  holdingCount: number;
  missingPriceCount: number;
}

export interface StockHoldingWithReturn {
  ticker: string;
  name: string;
  market: MarketType;
  currency: CurrencyType;
  quantity: number;
  avgPrice: number;
  currentPrice: number | null;
  totalInvested: number;
  currentValue: number;
  returnAmount: number;
  returnRate: number;
  allocationPercent: number;
}

export interface MarketBreakdown {
  market: MarketType;
  totalValue: number;
  percentage: number;
}

export interface CurrencyBreakdown {
  currency: CurrencyType;
  totalValue: number;
  percentage: number;
}

// 소유자별 분석 페이지용 타입
export interface OwnerAnalysisData {
  summary: MemberSummary[];
  holdings: OwnerHoldings[];
  exchangeRate: number;
}

export interface OwnerHoldings {
  ownerId: string;
  ownerName: string;
  stocks: StockHoldingWithReturn[];
}

// 위험도별 분석 페이지용 타입
export interface RiskLevelSummary {
  riskLevel: RiskLevel | null; // null = 미설정
  totalValue: number;
  percentage: number;
  holdings: RiskHoldingItem[];
}

export interface RiskHoldingItem {
  ticker: string;
  name: string;
  market: MarketType;
  quantity: number;
  currentValue: number;
  totalInvested: number;
  returnAmount: number;
  returnRate: number;
}

export interface ByRiskAnalysisData {
  totalValue: number;
  byRiskLevel: RiskLevelSummary[];
  exchangeRate: number;
}

// 시장 동향 타입
export interface MarketTrendItem {
  rank: number;
  ticker: string;
  name: string;
  price: number;
  change: number;
  changeRate: number;
  changeSign: "up" | "down" | "flat";
  volume?: number;
}

export interface DomesticMarketTrendData {
  volumeRank: MarketTrendItem[];
  gainers: MarketTrendItem[];
  losers: MarketTrendItem[];
  updatedAt: string;
}

// 해외 시장 동향 데이터 (거래량/가격)
export interface OverseasMarketTrendData {
  volumeSurge: MarketTrendItem[];
  gainers: MarketTrendItem[];
  losers: MarketTrendItem[];
  updatedAt: string;
}

// 해외 뉴스 항목
export interface OverseasNewsItem {
  newsKey: string;
  title: string;
  source: string;
  datetime: string;
  ticker?: string;
  tickerName?: string;
}

// 해외 뉴스 데이터
export interface OverseasNewsData {
  news: OverseasNewsItem[];
  updatedAt: string;
}
