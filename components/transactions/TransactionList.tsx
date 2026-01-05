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
  TransactionFilters as Filters,
  TransactionWithDetails,
} from "@/lib/api/transaction";
import type { PaginatedResult } from "@/lib/utils/query";
import { TransactionFilters } from "./TransactionFilters";
import { TransactionTable } from "./TransactionTable";

interface Member {
  id: string;
  name: string;
}

interface TransactionListProps {
  initialData: PaginatedResult<TransactionWithDetails>;
  members: Member[];
}

export function TransactionList({
  initialData,
  members,
}: TransactionListProps) {
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTransactions = async (newFilters: Filters, newPage: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (newFilters.type) params.set("type", newFilters.type);
      if (newFilters.ownerId) params.set("ownerId", newFilters.ownerId);
      if (newFilters.ticker) params.set("ticker", newFilters.ticker);
      params.set("page", String(newPage));

      const response = await fetch(`/api/transactions?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1);
    fetchTransactions(newFilters, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchTransactions(filters, newPage);
  };

  return (
    <div className="space-y-4">
      <TransactionFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        members={members}
      />

      <div className={isLoading ? "opacity-50 pointer-events-none" : ""}>
        <TransactionTable data={data.data} />
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
