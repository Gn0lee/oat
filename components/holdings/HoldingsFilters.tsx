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

interface Account {
  id: string;
  name: string;
}

interface HoldingsFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  members: Member[];
  accounts: Account[];
}

export function HoldingsFilters({
  filters,
  onFiltersChange,
  members,
  accounts,
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

  const handleAccountChange = (value: string) => {
    onFiltersChange({
      ...filters,
      accountId: value === "all" ? undefined : value,
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

      {accounts.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">계좌</span>
          <Select
            value={filters.accountId ?? "all"}
            onValueChange={handleAccountChange}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="unassigned">계좌 미지정</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
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
