"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useStockAnalysis } from "@/hooks/use-stock-analysis";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

const CHART_COLORS = [
  "#4F46E5", // 인디고
  "#03B26C", // 초록
  "#FF9F00", // 주황
  "#F04452", // 빨강
  "#6366F1", // 보라
  "#8B95A1", // 회색 (미배정용)
];

export function AccountBreakdownSection() {
  const { data, isLoading } = useStockAnalysis();

  const chartData = useMemo(() => {
    if (!data || data.byAccount.length === 0) return [];

    return data.byAccount.map((account, index) => ({
      id: account.accountId ?? "unassigned",
      name: account.accountName ?? "미배정",
      ownerName: account.accountOwnerName,
      value: account.totalValue,
      percentage: account.percentage,
      returnRate: account.returnRate,
      holdingCount: account.holdingCount,
      fill: account.accountId
        ? CHART_COLORS[index % (CHART_COLORS.length - 1)]
        : CHART_COLORS[CHART_COLORS.length - 1], // 미배정은 회색
    }));
  }, [data]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const item of chartData) {
      config[item.id] = {
        label: item.name,
        color: item.fill,
      };
    }
    return config;
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
          <div className="flex gap-6">
            <div className="size-48 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-6 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.byAccount.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-medium text-gray-900 mb-4">계좌별 비중</h3>
      <div className="flex flex-col md:flex-row gap-6">
        {/* 도넛 차트 */}
        <div className="shrink-0">
          <ChartContainer config={chartConfig} className="size-48">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(_value, _name, item) => (
                      <div className="flex items-center justify-between gap-4">
                        <span>{item.payload.name}</span>
                        <span className="font-mono font-medium">
                          {item.payload.percentage.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                strokeWidth={2}
                stroke="#fff"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.id} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>

        {/* 범례 리스트 */}
        <div className="flex-1 space-y-3">
          {chartData.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="size-3 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-gray-900">
                      {item.name}
                    </span>
                    {item.ownerName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 font-medium">
                        {item.ownerName}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {item.holdingCount}종목
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(item.value, "KRW")}
                </span>
                <div className="flex items-center justify-end gap-1">
                  <span
                    className={`text-xs ${
                      item.returnRate >= 0 ? "text-positive" : "text-negative"
                    }`}
                  >
                    {formatPercent(item.returnRate)}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
