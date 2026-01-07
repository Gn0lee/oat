"use client";

import { useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  type StockSettingsFilters as Filters,
  useStockSettings,
} from "@/hooks/use-stock-settings";
import type { StockSettingWithDetails } from "@/lib/api/stock-settings";
import type { PaginatedResult } from "@/lib/utils/query";
import { StockSettingsFilters } from "./StockSettingsFilters";
import { StockSettingsTable } from "./StockSettingsTable";

interface StockSettingsListProps {
  initialData: PaginatedResult<StockSettingWithDetails>;
}

export function StockSettingsList({ initialData }: StockSettingsListProps) {
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);

  const { data, isLoading } = useStockSettings({
    filters,
    page,
    pageSize: 20,
  });

  // React Query 데이터가 없으면 초기 데이터 사용
  const currentData = data ?? initialData;

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div className="space-y-4">
      <StockSettingsFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      <div className={isLoading ? "opacity-50 pointer-events-none" : ""}>
        <StockSettingsTable data={currentData.data} />
      </div>

      {currentData.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handlePageChange(page - 1)}
                className={
                  page <= 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-4 text-sm text-gray-700">
                {page} / {currentData.totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(page + 1)}
                className={
                  page >= currentData.totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
