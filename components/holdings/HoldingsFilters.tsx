"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MARKET_OPTIONS } from "@/constants/enums";
import type { HoldingsFilters as Filters } from "@/lib/api/holdings";
import type { MarketType } from "@/types";

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

  const handleMarketChange = (value: string) => {
    onFiltersChange({
      ...filters,
      market: value === "all" ? undefined : (value as MarketType),
    });
  };

  return (
    <div className="flex flex-wrap gap-4">
      {members.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">소유자</span>
          <Select
            value={filters.ownerId ?? "all"}
            onValueChange={handleOwnerChange}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
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
        </div>
      )}

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
