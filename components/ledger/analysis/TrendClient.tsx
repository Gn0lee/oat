"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useLedgerStatsTrend } from "@/hooks/use-ledger-stats";
import type { StatsScope } from "@/lib/api/ledger-stats";
import { formatCurrency } from "@/lib/utils/format";

const chartConfig = {
  totalExpense: { label: "지출", color: "#3182F6" },
  totalIncome: { label: "수입", color: "#F04452" },
  savingsRate: { label: "저축률", color: "#4F46E5" },
};

interface TrendClientProps {
  scope: StatsScope;
}

export function TrendClient({ scope }: TrendClientProps) {
  const { data, isLoading } = useLedgerStatsTrend(6, scope);

  const chartData = useMemo(() => {
    return (data?.items ?? []).map((item) => ({
      label: `${item.month}월`,
      totalIncome: item.totalIncome,
      totalExpense: item.totalExpense,
      savingsRate: item.savingsRate,
      balance: item.balance,
      year: item.year,
      month: item.month,
    }));
  }, [data]);

  const avgStats = useMemo(() => {
    const items = data?.items ?? [];
    if (items.length === 0) return { avgExpense: 0 };
    return {
      avgExpense: Math.round(
        items.reduce((s, i) => s + i.totalExpense, 0) / items.length,
      ),
    };
  }, [data]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="space-y-4">
      <PageHeader
        title="월별 수입·지출"
        backHref={`/ledger/analysis?scope=${scope}`}
      />

      {/* Section 1: ComposedChart */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          최근 6개월 수입·지출
        </h3>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm h-[280px]">
              <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
              <div className="h-[220px] bg-gray-100 rounded" />
            </div>
          </div>
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="h-[200px] w-full overflow-hidden"
            >
              <ComposedChart
                data={chartData}
                margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => `${Math.floor(v / 10000)}만`}
                  tick={{ fontSize: 10 }}
                  width={36}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(v) => formatCurrency(Number(v))}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="totalExpense"
                  name="지출"
                  fill="#3182F6"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                />
                <Bar
                  dataKey="totalIncome"
                  name="수입"
                  fill="#F04452"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                />
              </ComposedChart>
            </ChartContainer>

            {/* 저축률 라인 차트 (별도 섹션) */}
            <div className="mt-4 pt-4 border-t border-gray-50">
              <p className="text-xs text-gray-500 mb-2">저축률 추이</p>
              <ChartContainer
                config={{ savingsRate: { label: "저축률", color: "#4F46E5" } }}
                className="h-[80px] w-full overflow-hidden"
              >
                <ComposedChart
                  data={chartData}
                  margin={{ left: 0, right: 8, top: 4, bottom: 0 }}
                >
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10 }}
                    width={32}
                    domain={[0, 100]}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(v) => `${Number(v).toFixed(1)}%`}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="savingsRate"
                    name="저축률"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    dot={{ fill: "#4F46E5", r: 3 }}
                  />
                </ComposedChart>
              </ChartContainer>
            </div>
          </>
        )}
      </div>

      {/* Section 2: 평균 지출 카드 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs text-gray-500 mb-1">월 평균 지출</p>
        <p className="text-lg font-bold text-gray-900">
          {formatCurrency(avgStats.avgExpense)}
        </p>
        <p className="text-xs text-gray-400 mt-1">최근 6개월 기준</p>
      </div>

      {/* Section 3: 월별 요약 테이블 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">월별 상세</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-2 font-medium">월</th>
                <th className="text-right pb-2 font-medium">수입</th>
                <th className="text-right pb-2 font-medium">지출</th>
                <th className="text-right pb-2 font-medium">저축률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {chartData.map((row) => {
                const isCurrent =
                  row.year === currentYear && row.month === currentMonth;
                return (
                  <tr
                    key={`${row.year}-${row.month}`}
                    className={isCurrent ? "bg-primary/5" : ""}
                  >
                    <td
                      className={`py-2.5 ${
                        isCurrent
                          ? "font-semibold text-primary"
                          : "text-gray-700"
                      }`}
                    >
                      {row.year}년 {row.label}
                    </td>
                    <td className="py-2.5 text-right text-red-500 font-medium">
                      {formatCurrency(row.totalIncome)}
                    </td>
                    <td className="py-2.5 text-right text-gray-900">
                      {formatCurrency(row.totalExpense)}
                    </td>
                    <td
                      className={`py-2.5 text-right font-medium ${
                        row.savingsRate >= 20
                          ? "text-green-600"
                          : row.savingsRate >= 10
                            ? "text-yellow-600"
                            : "text-red-500"
                      }`}
                    >
                      {row.savingsRate.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
