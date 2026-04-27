"use client";

import { startOfMonth } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Banknote, CreditCard, Smartphone, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { PageHeader } from "@/components/layout";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useLedgerStatsByPaymentMethod } from "@/hooks/use-ledger-stats";
import type { StatsScope } from "@/lib/api/ledger-stats";
import { formatCurrency } from "@/lib/utils/format";
import { MonthSelector } from "./MonthSelector";

const CHART_COLORS = [
  "#4F46E5",
  "#F04452",
  "#3182F6",
  "#F59E0B",
  "#10B981",
  "#8B5CF6",
  "#EC4899",
];

function PaymentIcon({ type }: { type: string | null }) {
  if (type === "credit_card" || type === "debit_card")
    return <CreditCard className="w-4 h-4" />;
  if (type === "prepaid_pay") return <Smartphone className="w-4 h-4" />;
  if (type === "cash") return <Banknote className="w-4 h-4" />;
  return <Tag className="w-4 h-4" />;
}

interface ByPaymentMethodClientProps {
  scope: StatsScope;
}

export function ByPaymentMethodClient({ scope }: ByPaymentMethodClientProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;
  const { data, isLoading } = useLedgerStatsByPaymentMethod(year, month, scope);

  const chartData = useMemo(
    () =>
      (data?.items ?? []).map((item, i) => ({
        ...item,
        fill: CHART_COLORS[i % CHART_COLORS.length],
        avgPerEntry:
          item.entryCount > 0 ? Math.round(item.amount / item.entryCount) : 0,
      })),
    [data],
  );

  const chartConfig = useMemo(
    () =>
      Object.fromEntries(
        chartData.map((item) => [
          item.paymentMethodId ?? "null",
          { label: item.paymentMethodName, color: item.fill },
        ]),
      ),
    [chartData],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="결제수단 분석"
        backHref={`/ledger/analysis?scope=${scope}`}
      />
      <MonthSelector value={currentMonth} onChange={setCurrentMonth} />

      {/* 섹션 1: 도넛 차트 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          결제수단별 비중
        </h3>

        {isLoading ? (
          <div className="animate-pulse flex gap-6 items-center">
            <div className="w-40 h-40 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">
            이번 달 지출 내역이 없어요
          </p>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <ChartContainer config={chartConfig} className="size-48 shrink-0">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={chartData}
                  dataKey="amount"
                  nameKey="paymentMethodName"
                  innerRadius={50}
                  outerRadius={80}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {chartData.map((entry) => {
                    const id = entry.paymentMethodId ?? "null";
                    return (
                      <Cell
                        key={id}
                        fill={entry.fill}
                        style={{
                          filter:
                            hoveredId && hoveredId !== id
                              ? "grayscale(0.6) opacity(0.4)"
                              : "none",
                          transition: "all 0.3s ease",
                          cursor: "pointer",
                        }}
                        onMouseEnter={() => setHoveredId(id)}
                      />
                    );
                  })}
                </Pie>
              </PieChart>
            </ChartContainer>

            <AnimatePresence>
              <ul className="flex-1 space-y-1 w-full">
                {chartData.map((item) => {
                  const id = item.paymentMethodId ?? "null";
                  const isHovered = hoveredId === id;
                  return (
                    <motion.li
                      key={id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onMouseEnter={() => setHoveredId(id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all cursor-default ${isHovered ? "translate-x-1 bg-gray-50" : ""}`}
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.fill }}
                      />
                      <div className="text-gray-500 shrink-0">
                        <PaymentIcon type={item.paymentMethodType} />
                      </div>
                      <span className="text-sm text-gray-700 flex-1 truncate">
                        {item.paymentMethodName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {item.percentage.toFixed(1)}%
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.amount)}
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 섹션 2: 상세 목록 (건당 평균 포함) */}
      {!isLoading && chartData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            상세 내역
          </h3>
          <ul className="divide-y divide-gray-50">
            {chartData.map((item) => (
              <li
                key={item.paymentMethodId ?? "null"}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-gray-500">
                  <PaymentIcon type={item.paymentMethodType} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.paymentMethodName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {item.entryCount}건 · 건당 평균{" "}
                    {formatCurrency(item.avgPerEntry)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-900 shrink-0">
                  {formatCurrency(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
