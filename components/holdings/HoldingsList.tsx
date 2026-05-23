"use client";

import { useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useHoldings } from "@/hooks/use-holdings";
import type { HoldingsFilters as Filters } from "@/lib/api/holdings";
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
  members: Member[];
  accounts: Account[];
}

function HoldingsListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 rounded-xl bg-gray-200" />
      <Skeleton className="h-64 rounded-xl bg-gray-200" />
    </div>
  );
}

export function HoldingsList({ members, accounts }: HoldingsListProps) {
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, error } = useHoldings({
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

  const filterControls = (
    <HoldingsFilters
      filters={filters}
      onFiltersChange={handleFiltersChange}
      members={members}
      accounts={accounts}
    />
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {filterControls}
        <HoldingsListSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        {filterControls}
        <div className="rounded-xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            보유 현황을 불러오지 못했습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">총 {data.total}개 종목 보유 중</p>

      {filterControls}

      <div className={isFetching ? "opacity-50 pointer-events-none" : ""}>
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
