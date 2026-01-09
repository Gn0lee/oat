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
import { formatCurrency } from "@/lib/utils/format";

const CHART_COLORS = [
  "#4F46E5", // 인디고
  "#03B26C", // 초록
  "#FF9F00", // 주황
  "#F04452", // 빨강
  "#8B95A1", // 회색
  "#6366F1", // 보라
];

export function StockAllocationSection() {
  const { data, isLoading } = useStockAnalysis();

  const chartData = useMemo(() => {
    if (!data || data.holdings.length === 0) return [];

    // 상위 5개 + 기타
    const top5 = data.holdings.slice(0, 5);
    const others = data.holdings.slice(5);

    const result = top5.map((h, index) => ({
      name: h.name,
      ticker: h.ticker,
      value: h.currentValue,
      percentage: h.allocationPercent,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));

    if (others.length > 0) {
      const othersValue = others.reduce((sum, h) => sum + h.currentValue, 0);
      const othersPercent = others.reduce(
        (sum, h) => sum + h.allocationPercent,
        0,
      );
      result.push({
        name: `기타 (${others.length}종목)`,
        ticker: "OTHER",
        value: othersValue,
        percentage: othersPercent,
        fill: CHART_COLORS[5],
      });
    }

    return result;
  }, [data]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const item of chartData) {
      config[item.ticker] = {
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
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.holdings.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-medium text-gray-900 mb-4">종목별 비중</h3>
      <div className="flex flex-col md:flex-row gap-6">
        {/* 도넛 차트 */}
        <div className="flex-shrink-0">
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
                  <Cell key={entry.ticker} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>

        {/* 범례 리스트 */}
        <div className="flex-1 space-y-3">
          {chartData.map((item) => (
            <div
              key={item.ticker}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div
                  className="size-3 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-sm text-gray-700">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(item.value, "KRW")}
                </span>
                <span className="text-xs text-gray-500 ml-1">
                  ({item.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
