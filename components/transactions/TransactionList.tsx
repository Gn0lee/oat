"use client";

import { useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useTransactions } from "@/hooks/use-transaction";
import type { TransactionFilters as Filters } from "@/lib/api/transaction";
import { TransactionFilters } from "./TransactionFilters";
import { TransactionTable } from "./TransactionTable";

interface Member {
  id: string;
  name: string;
}

interface TransactionListProps {
  members: Member[];
  currentUserId: string;
}

export function TransactionList({
  members,
  currentUserId,
}: TransactionListProps) {
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);

  const { data, isLoading } = useTransactions({
    filters,
    page,
    pageSize: 20,
  });

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const transactions = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <TransactionFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        members={members}
      />

      <div className={isLoading ? "opacity-50 pointer-events-none" : ""}>
        <TransactionTable data={transactions} currentUserId={currentUserId} />
      </div>

      {totalPages > 1 && (
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
                {page} / {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(page + 1)}
                className={
                  page >= totalPages
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
