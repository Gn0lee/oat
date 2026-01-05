"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HoldingsFilters as Filters } from "@/lib/api/holdings";
import type { AssetType, MarketType } from "@/types";

interface Member {
  id: string;
  name: string;
}

interface HoldingsFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  members: Member[];
}

export function HoldingsFilters({
  filters,
  onFiltersChange,
  members,
}: HoldingsFiltersProps) {
  const handleOwnerChange = (value: string) => {
    onFiltersChange({
      ...filters,
      ownerId: value === "all" ? undefined : value,
    });
  };

  const handleAssetTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      assetType: value === "all" ? undefined : (value as AssetType),
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
      {members.length > 1 && (
        <Select
          value={filters.ownerId ?? "all"}
          onValueChange={handleOwnerChange}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="소유자" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

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
