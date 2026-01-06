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
      riskLevel: value === "all" ? undefined : (value as RiskLevel),
    });
  };

  const handleMarketChange = (value: string) => {
    onFiltersChange({
      ...filters,
      market: value === "all" ? undefined : (value as MarketType),
    });
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={filters.assetType ?? "all"}
        onValueChange={handleAssetTypeChange}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="자산유형" />
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

      <Select
        value={filters.riskLevel ?? "all"}
        onValueChange={handleRiskLevelChange}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="위험도" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          {RISK_LEVEL_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.market ?? "all"}
        onValueChange={handleMarketChange}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="시장" />
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
  );
}
