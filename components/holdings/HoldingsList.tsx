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
  HoldingsFilters as Filters,
  HoldingWithDetails,
} from "@/lib/api/holdings";
import type { PaginatedResult } from "@/lib/utils/query";
import { HoldingsFilters } from "./HoldingsFilters";
import { HoldingsTable } from "./HoldingsTable";

interface Member {
  id: string;
  name: string;
}

interface Account {
  id: string;
  name: string;
}

interface HoldingsListProps {
  initialData: PaginatedResult<HoldingWithDetails>;
  members: Member[];
  accounts: Account[];
}

export function HoldingsList({
  initialData,
  members,
  accounts,
}: HoldingsListProps) {
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHoldings = async (newFilters: Filters, newPage: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (newFilters.ownerId) params.set("ownerId", newFilters.ownerId);
      if (newFilters.market) params.set("market", newFilters.market);
      if (newFilters.accountId) params.set("accountId", newFilters.accountId);
      if (newFilters.search) params.set("search", newFilters.search);
      params.set("page", String(newPage));

      const response = await fetch(`/api/holdings?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch holdings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1);
    fetchHoldings(newFilters, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchHoldings(filters, newPage);
  };

  return (
    <div className="space-y-4">
      <HoldingsFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        members={members}
        accounts={accounts}
      />

      <div className={isLoading ? "opacity-50 pointer-events-none" : ""}>
        <HoldingsTable data={data.data} />
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
