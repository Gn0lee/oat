"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/format";
import type { MemberSummary } from "@/types";

const MEMBER_COLORS = ["#4F46E5", "#03B26C", "#FF9F00", "#F04452", "#8B95A1"];

interface OwnerAllocationChartProps {
  data: MemberSummary[];
  isLoading?: boolean;
}

export function OwnerAllocationChart({
  data,
  isLoading,
}: OwnerAllocationChartProps) {
  const chartData = useMemo(() => {
    return data.map((member, index) => ({
      id: member.memberId,
      name: member.memberName,
      value: member.totalValue,
      percentage: member.percentage,
      fill: MEMBER_COLORS[index % MEMBER_COLORS.length],
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

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 파이차트 섹션 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          소유자별 비중
        </h3>
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

      {/* 바차트 섹션 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          소유자별 자산 비교
        </h3>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 0, right: 20 }}
          >
            <XAxis
              type="number"
              tickFormatter={(value) => formatCompactNumber(value)}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={60}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <RechartsTooltip
              formatter={(value: number) => [
                formatCurrency(value, "KRW"),
                "평가금액",
              ]}
              labelStyle={{ color: "#374151" }}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
