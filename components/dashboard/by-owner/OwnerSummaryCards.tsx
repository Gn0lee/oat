"use client";

import { TrendingDown, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { MemberSummary } from "@/types";

const MEMBER_COLORS = ["#4F46E5", "#03B26C", "#FF9F00", "#F04452", "#8B95A1"];

interface OwnerSummaryCardsProps {
  data: MemberSummary[];
  isLoading?: boolean;
}

export function OwnerSummaryCards({ data, isLoading }: OwnerSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="animate-pulse space-y-3">
              <div className="h-5 w-20 bg-gray-200 rounded" />
              <div className="h-8 w-32 bg-gray-200 rounded" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.map((member, index) => {
        const isPositive = member.returnRate >= 0;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;
        const colorClass = isPositive ? "text-[#F04452]" : "text-[#3182F6]";
        const memberColor = MEMBER_COLORS[index % MEMBER_COLORS.length];

        return (
          <div
            key={member.memberId}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="size-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${memberColor}20` }}
                >
                  <User className="size-4" style={{ color: memberColor }} />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {member.memberName}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {member.percentage.toFixed(1)}%
              </span>
            </div>

            <p className="text-2xl font-bold text-gray-900 mt-3">
              {formatCurrency(member.totalValue, "KRW")}
            </p>

            <div className="flex items-center gap-1.5 mt-2">
              <TrendIcon className={cn("size-3.5", colorClass)} />
              <span className={cn("text-sm font-medium", colorClass)}>
                {formatPercent(member.returnRate)}
              </span>
              <span className="text-xs text-gray-400">
                ({isPositive ? "+" : ""}
                {formatCurrency(member.totalReturn, "KRW")})
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
