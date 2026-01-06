"use client";

import { useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type {
  StockSettingsFilters as Filters,
  StockSettingWithDetails,
} from "@/lib/api/stock-settings";
import type { PaginatedResult } from "@/lib/utils/query";
import { StockSettingsFilters } from "./StockSettingsFilters";
import { StockSettingsTable } from "./StockSettingsTable";

interface StockSettingsListProps {
  initialData: PaginatedResult<StockSettingWithDetails>;
}

export function StockSettingsList({ initialData }: StockSettingsListProps) {
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStockSettings = async (newFilters: Filters, newPage: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (newFilters.assetType) params.set("assetType", newFilters.assetType);
      if (newFilters.riskLevel) params.set("riskLevel", newFilters.riskLevel);
      if (newFilters.market) params.set("market", newFilters.market);
      params.set("page", String(newPage));

      const response = await fetch(`/api/stock-settings?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch stock settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1);
    fetchStockSettings(newFilters, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchStockSettings(filters, newPage);
  };

  return (
    <div className="space-y-4">
      <StockSettingsFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      <div className={isLoading ? "opacity-50 pointer-events-none" : ""}>
        <StockSettingsTable data={data.data} />
      </div>

      {data.totalPages > 1 && (
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
                {page} / {data.totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(page + 1)}
                className={
                  page >= data.totalPages
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
