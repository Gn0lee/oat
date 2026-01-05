"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TransactionFilters as Filters } from "@/lib/api/transaction";

interface Member {
  id: string;
  name: string;
}

interface TransactionFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  members: Member[];
}

export function TransactionFilters({
  filters,
  onFiltersChange,
  members,
}: TransactionFiltersProps) {
  const handleTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      type: value === "all" ? undefined : (value as "buy" | "sell"),
    });
  };

  const handleOwnerChange = (value: string) => {
    onFiltersChange({
      ...filters,
      ownerId: value === "all" ? undefined : value,
    });
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Select value={filters.type ?? "all"} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="거래 유형" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectItem value="buy">매수</SelectItem>
          <SelectItem value="sell">매도</SelectItem>
        </SelectContent>
      </Select>

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
    </div>
  );
}
