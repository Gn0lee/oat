"use client";

import { startOfMonth } from "date-fns";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/layout";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useLedgerStatsDaily } from "@/hooks/use-ledger-stats";
import type { StatsScope } from "@/lib/api/ledger-stats";
import { formatCurrency } from "@/lib/utils/format";
import { MonthSelector } from "./MonthSelector";
import { ScopeToggle } from "./ScopeToggle";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export function DailyClient() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );
  const [scope, setScope] = useState<StatsScope>("all");

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;
  const { data, isLoading } = useLedgerStatsDaily(year, month, scope);

  const items = data?.items ?? [];

  const dailyChartData = useMemo(
    () =>
      items.map((item) => ({
        day: `${Number(item.date.slice(8, 10))}일`,
        totalExpense: item.totalExpense,
        totalIncome: item.totalIncome,
        date: item.date,
      })),
    [items],
  );

  const dayOfWeekData = useMemo(() => {
    const groups = new Map<number, number[]>();
    for (const item of items) {
      const dow = new Date(item.date).getDay();
      const existing = groups.get(dow) ?? [];
      groups.set(dow, [...existing, item.totalExpense]);
    }
    return DAY_NAMES.map((name, i) => {
      const vals = groups.get(i) ?? [];
      return {
        name,
        avg:
          vals.length > 0
            ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
            : 0,
      };
    });
  }, [items]);

  const maxDowAvg = Math.max(...dayOfWeekData.map((d) => d.avg), 0);

  const monthTotal = useMemo(
    () => ({
      totalIncome: items.reduce((s, i) => s + i.totalIncome, 0),
      totalExpense: items.reduce((s, i) => s + i.totalExpense, 0),
      balance: items.reduce((s, i) => s + i.balance, 0),
    }),
    [items],
  );

  return (
    <div className="space-y-4">
      <PageHeader title="일별 지출 현황" backHref="/ledger/analysis" />
      <MonthSelector value={currentMonth} onChange={setCurrentMonth} />
      <ScopeToggle value={scope} onChange={setScope} />

      {/* 월 요약 스트립 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-xs text-gray-400 mb-1">수입</p>
          <p className="text-sm font-semibold text-red-500">
            {formatCurrency(monthTotal.totalIncome)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-xs text-gray-400 mb-1">지출</p>
          <p className="text-sm font-semibold text-gray-900">
            {formatCurrency(monthTotal.totalExpense)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-xs text-gray-400 mb-1">잔액</p>
          <p
            className={`text-sm font-semibold ${monthTotal.balance >= 0 ? "text-gray-900" : "text-blue-500"}`}
          >
            {formatCurrency(monthTotal.balance)}
          </p>
        </div>
      </div>

      {/* 섹션 1: 일별 지출 바 차트 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">일별 지출</h3>
        {isLoading ? (
          <div className="animate-pulse h-[200px] bg-gray-100 rounded" />
        ) : items.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">
            이번 달 지출 내역이 없어요
          </p>
        ) : (
          <ChartContainer
            config={{ totalExpense: { label: "지출", color: "#3182F6" } }}
            className="h-[200px]"
          >
            <BarChart
              data={dailyChartData}
              margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F3F4F6"
                vertical={false}
              />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
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
              <Bar dataKey="totalExpense" name="지출" radius={[3, 3, 0, 0]}>
                {dailyChartData.map((entry) => (
                  <Cell
                    key={entry.date}
                    fill="#3182F6"
                    fillOpacity={entry.totalExpense > 0 ? 1 : 0.2}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </div>

      {/* 섹션 2: 요일별 평균 패턴 */}
      {!isLoading && items.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            요일별 평균 지출
          </h3>
          <p className="text-xs text-gray-400 mb-4">이번 달 기준</p>
          <ChartContainer
            config={{ avg: { label: "평균 지출", color: "#4F46E5" } }}
            className="h-[160px]"
          >
            <BarChart
              data={dayOfWeekData}
              margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
            >
              <XAxis dataKey="name" tick={{ fontSize: 13 }} />
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
              <Bar dataKey="avg" name="평균 지출" radius={[4, 4, 0, 0]}>
                {dayOfWeekData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={
                      entry.avg === maxDowAvg && maxDowAvg > 0
                        ? "#F04452"
                        : "#4F46E5"
                    }
                    fillOpacity={entry.avg > 0 ? 1 : 0.2}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          {maxDowAvg > 0 && (
            <p className="text-xs text-gray-500 mt-3 text-center">
              {dayOfWeekData.find((d) => d.avg === maxDowAvg)?.name}요일 평균
              지출이 가장 높아요
            </p>
          )}
        </div>
      )}
    </div>
  );
}
