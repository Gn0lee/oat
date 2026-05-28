"use client";

import { ArrowDownUp, Building2, UserRound, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MARKET_LABELS } from "@/constants/enums";
import type { HoldingWithDetails } from "@/lib/api/holdings";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";

interface HoldingsTableProps {
  data: HoldingWithDetails[];
}

type HoldingsSortKey = "totalInvested" | "quantity" | "name";

const SORT_OPTIONS: { key: HoldingsSortKey; label: string }[] = [
  { key: "totalInvested", label: "투자금" },
  { key: "quantity", label: "수량" },
  { key: "name", label: "종목명" },
];

function sortHoldings(
  holdings: HoldingWithDetails[],
  sortKey: HoldingsSortKey,
): HoldingWithDetails[] {
  return [...holdings].sort((a, b) => {
    if (sortKey === "name") {
      return a.name.localeCompare(b.name, "ko-KR");
    }
    return b[sortKey] - a[sortKey];
  });
}

export function HoldingsTable({ data }: HoldingsTableProps) {
  const [sortKey, setSortKey] = useState<HoldingsSortKey>("totalInvested");
  const sortedHoldings = useMemo(
    () => sortHoldings(data, sortKey),
    [data, sortKey],
  );

  if (data.length === 0) {
    return (
      <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-gray-100">
        <WalletCards className="mx-auto mb-3 size-8 text-gray-300" />
        <p className="font-medium text-gray-700">보유 종목이 없습니다.</p>
        <p className="mt-1 text-gray-400 text-sm">
          거래를 등록하면 보유 종목이 여기에 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-gray-500 text-sm">총 {data.length}개 종목</p>
        <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1">
          {SORT_OPTIONS.map((option) => (
            <Button
              key={option.key}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSortKey(option.key)}
              className={cn(
                "h-8 rounded-full px-3 text-gray-500 text-xs",
                sortKey === option.key && "bg-white text-gray-900 shadow-sm",
              )}
            >
              {sortKey === option.key && <ArrowDownUp className="size-3" />}
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {sortedHoldings.map((holding) => (
          <article
            key={`${holding.owner.id}:${holding.account.id ?? "none"}:${holding.ticker}`}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold text-gray-900">
                    {holding.name}
                  </h3>
                  <Badge variant="outline">
                    {MARKET_LABELS[holding.market] ?? holding.market}
                  </Badge>
                </div>
                <p className="mt-1 text-gray-400 text-xs">{holding.ticker}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs">투자 금액</p>
                <p className="font-bold text-gray-900 tabular-nums">
                  {formatCurrency(holding.totalInvested, holding.currency)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-gray-500 text-xs">수량</p>
                <p className="mt-1 font-semibold text-gray-900 tabular-nums">
                  {holding.quantity.toLocaleString()}주
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-gray-500 text-xs">평균 매수가</p>
                <p className="mt-1 font-semibold text-gray-900 tabular-nums">
                  {formatCurrency(holding.avgPrice, holding.currency)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-gray-500 text-sm">
              <span className="inline-flex items-center gap-1">
                <UserRound className="size-4" />
                {holding.owner.name}
              </span>
              <span className="inline-flex items-center gap-1">
                <Building2 className="size-4" />
                {holding.account.name ?? "미지정 계좌"}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
