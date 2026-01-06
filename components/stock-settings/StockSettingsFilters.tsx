"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ASSET_TYPE_OPTIONS,
  MARKET_OPTIONS,
  RISK_LEVEL_OPTIONS,
} from "@/constants/enums";
import type { StockSettingsFilters as Filters } from "@/lib/api/stock-settings";
import type { AssetType, MarketType, RiskLevel } from "@/types";

interface StockSettingsFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function StockSettingsFilters({
  filters,
  onFiltersChange,
}: StockSettingsFiltersProps) {
  const handleAssetTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      assetType: value === "all" ? undefined : (value as AssetType),
    });
  };

  const handleRiskLevelChange = (value: string) => {
    onFiltersChange({
      ...filters,
      riskLevel: value === "all" ? undefined : (value as RiskLevel | "null"),
    });
  };

  const handleMarketChange = (value: string) => {
    onFiltersChange({
      ...filters,
      market: value === "all" ? undefined : (value as MarketType),
    });
  };

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">자산유형</span>
        <Select
          value={filters.assetType ?? "all"}
          onValueChange={handleAssetTypeChange}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {ASSET_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">위험도</span>
        <Select
          value={filters.riskLevel ?? "all"}
          onValueChange={handleRiskLevelChange}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="null">미설정</SelectItem>
            {RISK_LEVEL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">시장</span>
        <Select
          value={filters.market ?? "all"}
          onValueChange={handleMarketChange}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {MARKET_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
