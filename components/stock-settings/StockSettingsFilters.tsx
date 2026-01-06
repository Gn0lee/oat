"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
          <SelectItem value="equity">주식</SelectItem>
          <SelectItem value="bond">채권</SelectItem>
          <SelectItem value="cash">현금</SelectItem>
          <SelectItem value="commodity">원자재</SelectItem>
          <SelectItem value="crypto">암호화폐</SelectItem>
          <SelectItem value="alternative">대체투자</SelectItem>
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
          <SelectItem value="low">저위험</SelectItem>
          <SelectItem value="medium">중위험</SelectItem>
          <SelectItem value="high">고위험</SelectItem>
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
          <SelectItem value="KR">국내</SelectItem>
          <SelectItem value="US">미국</SelectItem>
          <SelectItem value="OTHER">기타</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
