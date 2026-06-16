"use client";

import { ArrowDownUp, Building2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { GroupedList, ScreenState } from "@/components/layout/screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MARKET_LABELS } from "@/constants/enums";
import type { HoldingWithDetails } from "@/lib/api/holdings";
import { cn } from "@/lib/utils/cn";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils/format";

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
      <ScreenState
        type="empty"
        title="보유 종목이 없습니다."
        description="거래를 등록하면 보유 종목이 여기에 표시됩니다."
      />
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

      <GroupedList>
        {sortedHoldings.map((holding) => (
          <article
            key={`${holding.owner.id}:${holding.account.id ?? "none"}:${holding.ticker}`}
            className="flex flex-col gap-2 px-4 py-3.5 sm:px-5"
          >
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Badge
                  variant="outline"
                  className="shrink-0 px-1.5 py-0 text-[10px]"
                >
                  {MARKET_LABELS[holding.market] ?? holding.market}
                </Badge>
                <Popover>
                  <PopoverTrigger className="cursor-pointer truncate text-left font-semibold text-gray-900 text-sm transition-colors hover:text-gray-600">
                    {holding.name}
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-3 text-sm shadow-md"
                    align="start"
                  >
                    <div className="mb-1 font-semibold text-gray-900">
                      {holding.name}
                    </div>
                    <div className="flex flex-col gap-1 text-gray-500">
                      <div>
                        총 투자 금액:{" "}
                        <span className="font-medium text-gray-900">
                          {formatCurrency(
                            holding.totalInvested,
                            holding.currency,
                          )}
                        </span>
                      </div>
                      <div>
                        평균 매수가:{" "}
                        <span className="font-medium text-gray-900">
                          {formatCurrency(holding.avgPrice, holding.currency)}
                        </span>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="shrink-0 font-medium text-gray-900 text-sm tabular-nums">
                {formatCompactCurrency(holding.totalInvested, holding.currency)}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500 text-xs">
              <span className="font-medium text-gray-400">
                {holding.ticker}
              </span>
              <span>{holding.quantity.toLocaleString()}주</span>
              <span>
                평단 {formatCompactCurrency(holding.avgPrice, holding.currency)}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-400 text-xs">
              <span className="inline-flex min-w-0 items-center gap-1">
                <UserRound className="size-3 shrink-0" />
                <span className="truncate">{holding.owner.name}</span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-1">
                <Building2 className="size-3 shrink-0" />
                <span className="truncate">
                  {holding.account.name ?? "미지정 계좌"}
                </span>
              </span>
            </div>
          </article>
        ))}
      </GroupedList>
    </div>
  );
}
