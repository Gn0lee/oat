"use client";

import { Filter, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MARKET_OPTIONS } from "@/constants/enums";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
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
  const [searchValue, setSearchValue] = useState(filters.search ?? "");
  const debouncedSearch = useDebouncedValue(searchValue, 300);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 검색어 변경 핸들러
  useEffect(() => {
    if (debouncedSearch !== (filters.search ?? "")) {
      onFiltersChange({ ...filters, search: debouncedSearch || undefined });
    }
  }, [debouncedSearch, filters, onFiltersChange]);

  const handleClearFilters = () => {
    setSearchValue("");
    onFiltersChange({});
  };

  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) => key !== "search" && value !== undefined,
  );

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => key !== "search" && value !== undefined,
  ).length;

  const FilterContent = ({ isMobile = false }) => (
    <div className={isMobile ? "grid gap-4 py-4" : "flex flex-wrap gap-3"}>
      {members.length > 1 && (
        <Select
          value={filters.ownerId ?? "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              ownerId: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className={isMobile ? "w-full" : "w-[120px]"}>
            <SelectValue placeholder="소유자" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 소유자</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {accounts.length > 0 && (
        <Select
          value={filters.accountId ?? "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              accountId: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className={isMobile ? "w-full" : "w-[140px]"}>
            <SelectValue placeholder="계좌" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 계좌</SelectItem>
            <SelectItem value="unassigned">계좌 미지정</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={filters.market ?? "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            market: value === "all" ? undefined : (value as MarketType),
          })
        }
      >
        <SelectTrigger className={isMobile ? "w-full" : "w-[120px]"}>
          <SelectValue placeholder="시장" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 시장</SelectItem>
          {MARKET_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(hasActiveFilters || searchValue) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="h-9 px-2 text-gray-500"
        >
          <X className="mr-1 size-4" />
          초기화
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      {/* 검색 바 */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          placeholder="종목명 또는 티커 검색"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9 h-10 w-full bg-white rounded-xl border-gray-200"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => setSearchValue("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* 모바일 필터 버튼 */}
      <div className="flex gap-2 md:hidden">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl relative"
            >
              <Filter className="mr-2 size-4" />
              필터
              {activeFilterCount > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px]">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>필터 설정</DialogTitle>
            </DialogHeader>
            <FilterContent isMobile />
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClearFilters}
              >
                초기화
              </Button>
              <Button className="flex-1" onClick={() => setIsDialogOpen(false)}>
                확인
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 데스크탑 필터 레이아웃 */}
      <div className="hidden md:block">
        <FilterContent />
      </div>
    </div>
  );
}
