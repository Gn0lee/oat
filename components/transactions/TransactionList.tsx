"use client";

import { useState } from "react";
import { ScreenSection, SectionHeader } from "@/components/layout/screen";
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
  currentUserId?: string;
  action?: React.ReactNode;
}

export function TransactionList({
  members,
  currentUserId: _currentUserId,
  action,
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
  const detailQueryString = buildTransactionDetailQueryString(filters, page);

  return (
    <ScreenSection>
      <SectionHeader title="거래 내역" action={action} />

      <TransactionFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        members={members}
      />

      <div className={isLoading ? "opacity-50 pointer-events-none" : ""}>
        <TransactionTable
          data={transactions}
          detailQueryString={detailQueryString}
        />
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
    </ScreenSection>
  );
}

function buildTransactionDetailQueryString(filters: Filters, page: number) {
  const params = new URLSearchParams({ from: "transactions" });
  if (page > 1) params.set("page", String(page));
  if (filters.type) params.set("type", filters.type);
  if (filters.ownerId) params.set("ownerId", filters.ownerId);
  if (filters.accountId) params.set("accountId", filters.accountId);
  if (filters.ticker) params.set("ticker", filters.ticker);
  if (filters.search) params.set("search", filters.search);
  return params.toString();
}
