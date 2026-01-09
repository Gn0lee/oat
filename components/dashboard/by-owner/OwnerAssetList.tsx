"use client";

import {
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { OwnerHoldings } from "@/types";

const MEMBER_COLORS = ["#4F46E5", "#03B26C", "#FF9F00", "#F04452", "#8B95A1"];

interface OwnerAssetListProps {
  data: OwnerHoldings[];
  isLoading?: boolean;
}

export function OwnerAssetList({ data, isLoading }: OwnerAssetListProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (ownerId: string) => {
    setExpanded((prev) => ({
      ...prev,
      [ownerId]: !prev[ownerId],
    }));
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-12 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-medium text-gray-900 mb-4">
        소유자별 보유 종목
      </h3>
      <div className="space-y-3">
        {data.map((owner, index) => {
          const isExpanded = expanded[owner.ownerId] ?? false;
          const memberColor = MEMBER_COLORS[index % MEMBER_COLORS.length];

          return (
            <div
              key={owner.ownerId}
              className="border border-gray-100 rounded-xl overflow-hidden"
            >
              {/* 헤더 (클릭 가능) */}
              <button
                type="button"
                onClick={() => toggleExpand(owner.ownerId)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="size-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${memberColor}20` }}
                  >
                    <User className="size-4" style={{ color: memberColor }} />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium text-gray-900">
                      {owner.ownerName}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      {owner.stocks.length}종목
                    </span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="size-5 text-gray-400" />
                ) : (
                  <ChevronDown className="size-5 text-gray-400" />
                )}
              </button>

              {/* 상세 종목 리스트 */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/50">
                  {owner.stocks.map((stock) => {
                    const isPositive = stock.returnRate >= 0;
                    const TrendIcon = isPositive ? TrendingUp : TrendingDown;
                    const colorClass = isPositive
                      ? "text-[#F04452]"
                      : "text-[#3182F6]";

                    return (
                      <div
                        key={stock.ticker}
                        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {stock.name}
                            </span>
                            <span className="text-xs text-gray-400 shrink-0">
                              {stock.ticker}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">
                              {stock.quantity.toLocaleString()}주
                            </span>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs text-gray-500">
                              {stock.market}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(stock.currentValue, "KRW")}
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <TrendIcon className={cn("size-3", colorClass)} />
                            <span
                              className={cn("text-xs font-medium", colorClass)}
                            >
                              {formatPercent(stock.returnRate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
