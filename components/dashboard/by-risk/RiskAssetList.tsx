"use client";

import {
  ChevronDown,
  ChevronUp,
  Shield,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { RISK_LEVEL_LABELS } from "@/constants/enums";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { RiskLevel, RiskLevelSummary } from "@/types";

// 위험도 차트 색상 (HEX)
const RISK_LEVEL_COLORS: Record<RiskLevel | "null", string> = {
  safe: "#03B26C",
  moderate: "#FF9F00",
  aggressive: "#F04452",
  null: "#8B95A1",
};

// 위험도 표시 순서 (안전 → 중립 → 공격 → 미설정)
const RISK_LEVEL_ORDER: (RiskLevel | null)[] = [
  "safe",
  "moderate",
  "aggressive",
  null,
];

function getRiskLevelLabel(riskLevel: RiskLevel | null): string {
  return riskLevel ? RISK_LEVEL_LABELS[riskLevel] : "미설정";
}

function getRiskLevelColor(riskLevel: RiskLevel | null): string {
  return RISK_LEVEL_COLORS[riskLevel ?? "null"];
}

interface RiskAssetListProps {
  data: RiskLevelSummary[];
  isLoading?: boolean;
}

export function RiskAssetList({ data, isLoading }: RiskAssetListProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (riskLevel: string) => {
    setExpanded((prev) => ({
      ...prev,
      [riskLevel]: !prev[riskLevel],
    }));
  };

  // 위험도 순서대로 정렬
  const sortedData = [...data].sort((a, b) => {
    const aIndex = RISK_LEVEL_ORDER.indexOf(a.riskLevel);
    const bIndex = RISK_LEVEL_ORDER.indexOf(b.riskLevel);
    return aIndex - bIndex;
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          {[1, 2, 3].map((i) => (
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
        위험도별 보유 종목
      </h3>
      <div className="space-y-3">
        {sortedData.map((risk) => {
          const riskKey = risk.riskLevel ?? "null";
          const isExpanded = expanded[riskKey] ?? false;
          const riskColor = getRiskLevelColor(risk.riskLevel);

          return (
            <div
              key={riskKey}
              className="border border-gray-100 rounded-xl overflow-hidden"
            >
              {/* 헤더 (클릭 가능) */}
              <button
                type="button"
                onClick={() => toggleExpand(riskKey)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="size-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${riskColor}20` }}
                  >
                    <Shield className="size-4" style={{ color: riskColor }} />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium text-gray-900">
                      {getRiskLevelLabel(risk.riskLevel)}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      {risk.holdings.length}종목
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(risk.totalValue, "KRW")}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="size-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="size-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* 상세 종목 리스트 */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/50">
                  {risk.holdings.map((stock) => {
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
