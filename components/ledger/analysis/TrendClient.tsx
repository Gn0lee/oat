"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLedgerStatsTrend } from "@/hooks/use-ledger-stats";
import type { StatsScope } from "@/lib/api/ledger-stats";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";

const chartConfig = {
  totalExpense: { label: "지출", color: "#3182F6" },
  totalIncome: { label: "수입", color: "#F04452" },
  savingsRate: { label: "저축률", color: "#4F46E5" },
};

function getSavingsRateClassName(savingsRate: number) {
  if (savingsRate >= 20) return "text-green-600";
  if (savingsRate >= 10) return "text-yellow-600";
  return "text-red-500";
}

interface TrendClientProps {
  scope: StatsScope;
}

export function TrendClient({ scope }: TrendClientProps) {
  const { data, isLoading } = useLedgerStatsTrend(6, scope);
  const [navigationTarget, setNavigationTarget] = useState<{
    year: number;
    month: number;
    type: "income" | "expense";
  } | null>(null);

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
  const targetHref = navigationTarget
    ? `/ledger/records?year=${navigationTarget.year}&month=${navigationTarget.month}&scope=${scope}&type=${navigationTarget.type}`
    : "/ledger/records";
  const targetTypeLabel = navigationTarget?.type === "income" ? "수입" : "지출";

  return (
    <div className="space-y-4">
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
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <ComposedChart
                data={chartData}
                margin={{ left: 4, right: 8, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => `${Math.floor(v / 10000)}만`}
                  tick={{ fontSize: 10 }}
                  width={44}
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
                  className="cursor-pointer"
                  onClick={(row) => {
                    const payload = row.payload as {
                      year: number;
                      month: number;
                    };
                    setNavigationTarget({
                      year: payload.year,
                      month: payload.month,
                      type: "expense",
                    });
                  }}
                />
                <Bar
                  dataKey="totalIncome"
                  name="수입"
                  fill="#F04452"
                  radius={[4, 4, 0, 0]}
                  className="cursor-pointer"
                  onClick={(row) => {
                    const payload = row.payload as {
                      year: number;
                      month: number;
                    };
                    setNavigationTarget({
                      year: payload.year,
                      month: payload.month,
                      type: "income",
                    });
                  }}
                />
              </ComposedChart>
            </ChartContainer>

            {/* 저축률 라인 차트 (별도 섹션) */}
            <div className="mt-4 pt-4 border-t border-gray-50">
              <p className="text-xs text-gray-500 mb-2">저축률 추이</p>
              <ChartContainer
                config={{ savingsRate: { label: "저축률", color: "#4F46E5" } }}
                className="h-[80px] w-full"
              >
                <ComposedChart
                  data={chartData}
                  margin={{ left: 4, right: 8, top: 4, bottom: 0 }}
                >
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10 }}
                    width={36}
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

      {/* Section 3: 월별 요약 목록 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">월별 상세</h3>
        <div className="space-y-3">
          {chartData.map((row) => {
            const isCurrent =
              row.year === currentYear && row.month === currentMonth;
            return (
              <article
                key={`${row.year}-${row.month}`}
                className={cn(
                  "rounded-2xl border border-gray-100 bg-gray-50/70 p-4",
                  isCurrent && "border-primary/20 bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p
                      className={cn(
                        "font-semibold text-gray-900",
                        isCurrent && "text-primary",
                      )}
                    >
                      {row.year}년 {row.label}
                    </p>
                    {isCurrent && (
                      <p className="mt-0.5 text-primary/70 text-xs">이번 달</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs">저축률</p>
                    <p
                      className={cn(
                        "font-bold tabular-nums",
                        getSavingsRateClassName(row.savingsRate),
                      )}
                    >
                      {row.savingsRate.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setNavigationTarget({
                        year: row.year,
                        month: row.month,
                        type: "income",
                      })
                    }
                    className="rounded-xl text-left transition-colors hover:bg-white/70"
                  >
                    <p className="text-gray-500 text-xs">수입</p>
                    <p className="mt-1 font-semibold text-red-500 tabular-nums">
                      {formatCurrency(row.totalIncome)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNavigationTarget({
                        year: row.year,
                        month: row.month,
                        type: "expense",
                      })
                    }
                    className="rounded-xl text-left transition-colors hover:bg-white/70"
                  >
                    <p className="text-gray-500 text-xs">지출</p>
                    <p className="mt-1 font-semibold text-gray-900 tabular-nums">
                      {formatCurrency(row.totalExpense)}
                    </p>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <Dialog
        open={!!navigationTarget}
        onOpenChange={(open) => {
          if (!open) setNavigationTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>기록 화면으로 이동할까요?</DialogTitle>
            <DialogDescription>
              {navigationTarget
                ? `${navigationTarget.year}년 ${navigationTarget.month}월 ${targetTypeLabel} 기록을 확인합니다.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNavigationTarget(null)}>
              취소
            </Button>
            <Button asChild>
              <Link href={targetHref}>이동하기</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
