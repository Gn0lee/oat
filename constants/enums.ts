import type { AssetType, MarketType, RiskLevel } from "@/types";

/**
 * 자산유형 레이블 매핑
 */
export const ASSET_TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: "equity", label: "주식" },
  { value: "bond", label: "채권" },
  { value: "cash", label: "현금" },
  { value: "commodity", label: "원자재" },
  { value: "crypto", label: "암호화폐" },
  { value: "alternative", label: "대체투자" },
];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = Object.fromEntries(
  ASSET_TYPE_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<AssetType, string>;

/**
 * 시장 레이블 매핑
 */
export const MARKET_OPTIONS: { value: MarketType; label: string }[] = [
  { value: "KR", label: "국내" },
  { value: "US", label: "미국" },
  { value: "OTHER", label: "기타" },
];

export const MARKET_LABELS: Record<MarketType, string> = Object.fromEntries(
  MARKET_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<MarketType, string>;

/**
 * 위험도 레이블 매핑
 */
export const RISK_LEVEL_OPTIONS: { value: RiskLevel; label: string }[] = [
  { value: "safe", label: "안전" },
  { value: "moderate", label: "중립" },
  { value: "aggressive", label: "공격" },
];

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = Object.fromEntries(
  RISK_LEVEL_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<RiskLevel, string>;

/**
 * 위험도 컬러 매핑 (Badge용)
 */
export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  safe: "bg-green-100 text-green-800",
  moderate: "bg-yellow-100 text-yellow-800",
  aggressive: "bg-red-100 text-red-800",
};
