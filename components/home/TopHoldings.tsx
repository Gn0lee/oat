"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { HoldingWithDetails } from "@/lib/api/holdings";
import { queries } from "@/lib/queries/keys";
import { formatCurrency } from "@/lib/utils/format";
import type { PaginatedResult } from "@/lib/utils/query";

async function fetchTopHoldings(): Promise<
  PaginatedResult<HoldingWithDetails>
> {
  const response = await fetch("/api/holdings?pageSize=5");
  if (!response.ok) {
    throw new Error("보유 현황 조회에 실패했습니다.");
  }
  return response.json();
}

export function TopHoldings() {
  const { data, isLoading } = useQuery({
    queryKey: queries.holdings.list.queryKey,
    queryFn: fetchTopHoldings,
  });

  const holdings = data?.data ?? [];

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">보유 종목 TOP 5</h3>
        <Link
          href="/assets/stock/holdings"
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          전체 보기
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : holdings.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">
          아직 보유 종목이 없어요
        </div>
      ) : (
        <div className="space-y-3">
          {holdings.map((holding, index) => (
            <div
              key={`${holding.ticker}-${holding.owner.id}`}
              className="flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center size-6 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{holding.name}</p>
                  <p className="text-xs text-gray-500">{holding.owner.name}</p>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-900 tabular-nums">
                {formatCurrency(holding.totalInvested, holding.currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
