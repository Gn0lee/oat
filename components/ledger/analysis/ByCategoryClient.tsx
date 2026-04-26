"use client";

import { startOfMonth } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/layout";
import { CategoryIcon } from "@/components/ledger/CategoryIcon";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLedgerStatsByCategory } from "@/hooks/use-ledger-stats";
import type { StatsScope } from "@/lib/api/ledger-stats";
import { formatCurrency } from "@/lib/utils/format";
import { MonthSelector } from "./MonthSelector";
import { ScopeToggle } from "./ScopeToggle";

const CHART_COLORS = [
  "#4F46E5",
  "#F04452",
  "#3182F6",
  "#F59E0B",
  "#10B981",
  "#8B5CF6",
  "#EC4899",
];

export function ByCategoryClient() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );
  const [scope, setScope] = useState<StatsScope>("all");
  const [entryType, setEntryType] = useState<"expense" | "income">("expense");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;

  const { data, isLoading } = useLedgerStatsByCategory(
    year,
    month,
    entryType,
    scope,
  );
  const { data: prevData } = useLedgerStatsByCategory(
    prevYear,
    prevMonth,
    entryType,
    scope,
  );

  useEffect(() => {
    if (data?.items && selectedIds.length === 0) {
      setSelectedIds(data.items.map((item) => item.categoryId ?? "null"));
    }
  }, [data, selectedIds.length]);

  const processedData = useMemo(() => {
    if (!data?.items) return [];
    const allItems = data.items;
    const selected = allItems.filter((item) =>
      selectedIds.includes(item.categoryId ?? "null"),
    );
    const top5 = selected.slice(0, 5);
    const others = selected.slice(5);
    const colored = top5.map((item, i) => ({
      ...item,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
    if (others.length === 0) return colored;
    const otherAmount = others.reduce((s, o) => s + o.amount, 0);
    const otherPct =
      data.total > 0 ? Math.round((otherAmount / data.total) * 10000) / 100 : 0;
    return [
      ...colored,
      {
        categoryId: "other",
        categoryName: `기타 (${others.length})`,
        categoryIcon: null,
        amount: otherAmount,
        percentage: otherPct,
        entryCount: others.reduce((s, o) => s + o.entryCount, 0),
        fill: "#8B95A1",
      },
    ];
  }, [data, selectedIds]);

  const comparisonData = useMemo(() => {
    if (!data?.items) return [];
    return data.items.slice(0, 6).map((item) => {
      const prev = prevData?.items.find(
        (p) => p.categoryId === item.categoryId,
      );
      return {
        name: item.categoryName,
        current: item.amount,
        prev: prev?.amount ?? 0,
      };
    });
  }, [data, prevData]);

  const chartConfig = useMemo(() => {
    return Object.fromEntries(
      processedData.map((item) => [
        item.categoryId ?? "null",
        { label: item.categoryName, color: item.fill },
      ]),
    );
  }, [processedData]);

  const toggleId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader title="카테고리별 지출" backHref="/ledger/analysis" />

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="inline-flex rounded-lg bg-gray-100 p-1 gap-1">
          {(["expense", "income"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setEntryType(type);
                setSelectedIds([]);
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                entryType === type
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {type === "expense" ? "지출" : "수입"}
            </button>
          ))}
        </div>
        <ScopeToggle value={scope} onChange={setScope} />
      </div>

      <MonthSelector value={currentMonth} onChange={setCurrentMonth} />

      {/* Section 1: 도넛 차트 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            카테고리별 비중
          </h3>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
              >
                <Search className="w-3.5 h-3.5" />
                {selectedIds.length}개 선택
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <Command>
                <CommandInput placeholder="카테고리 검색..." className="h-9" />
                <CommandList className="max-h-48">
                  <CommandEmpty>카테고리가 없어요</CommandEmpty>
                  <CommandGroup>
                    {data?.items.map((item) => {
                      const id = item.categoryId ?? "null";
                      const isSelected = selectedIds.includes(id);
                      return (
                        <CommandItem
                          key={id}
                          onSelect={() => toggleId(id)}
                          className="gap-2"
                        >
                          <div
                            className={`w-4 h-4 border rounded flex items-center justify-center ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <CategoryIcon
                            iconName={item.categoryIcon}
                            className="w-4 h-4 text-gray-500"
                          />
                          <span className="text-sm flex-1">
                            {item.categoryName}
                          </span>
                          <span className="text-xs text-gray-400">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex gap-6 items-center">
                <div className="w-48 h-48 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-3">
                  {["a", "b", "c", "d"].map((k) => (
                    <div key={k} className="h-4 bg-gray-200 rounded" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : processedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm">데이터가 없어요</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {/* Donut chart */}
            <ChartContainer config={chartConfig} className="size-48 shrink-0">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={processedData}
                  dataKey="amount"
                  nameKey="categoryName"
                  innerRadius={50}
                  outerRadius={80}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {processedData.map((entry) => (
                    <Cell
                      key={entry.categoryId ?? "null"}
                      fill={entry.fill}
                      style={{
                        filter:
                          hoveredId &&
                          hoveredId !== (entry.categoryId ?? "null")
                            ? "grayscale(0.6) opacity(0.4)"
                            : "none",
                        transition: "all 0.3s ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={() =>
                        setHoveredId(entry.categoryId ?? "null")
                      }
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* Legend list with framer-motion */}
            <AnimatePresence>
              <ul className="flex-1 space-y-1 w-full">
                {processedData.map((item) => {
                  const id = item.categoryId ?? "null";
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
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all cursor-default ${
                        isHovered ? "translate-x-1 bg-gray-50" : ""
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.fill }}
                      />
                      <CategoryIcon
                        iconName={item.categoryIcon}
                        className="w-4 h-4 text-gray-500 shrink-0"
                      />
                      <span className="text-sm text-gray-700 flex-1">
                        {item.categoryName}
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

      {/* Section 2: 전월 대비 비교 */}
      {comparisonData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            전월 대비 ({prevMonth}월 → {month}월)
          </h3>
          <ChartContainer
            config={{
              current: { label: "이번달", color: "#4F46E5" },
              prev: { label: "지난달", color: "#E5E7EB" },
            }}
            className="h-[200px]"
          >
            <BarChart
              data={comparisonData}
              layout="vertical"
              margin={{ left: 60, right: 16, top: 4, bottom: 4 }}
            >
              <XAxis
                type="number"
                tickFormatter={(v) => `${Math.floor(v / 10000)}만`}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={60}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                }
              />
              <Bar
                dataKey="prev"
                name="지난달"
                fill="#E5E7EB"
                radius={[0, 4, 4, 0]}
                barSize={8}
              />
              <Bar
                dataKey="current"
                name="이번달"
                fill="#4F46E5"
                radius={[0, 4, 4, 0]}
                barSize={8}
              />
            </BarChart>
          </ChartContainer>
        </div>
      )}

      {/* Section 3: 카테고리 상세 목록 */}
      {data && data.items.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            상세 내역
          </h3>
          <ul className="space-y-3">
            {data.items.map((item) => (
              <li
                key={item.categoryId ?? "null"}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <CategoryIcon
                    iconName={item.categoryIcon}
                    className="w-4 h-4 text-gray-600"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-gray-700 truncate">
                      {item.categoryName}
                    </span>
                    <span className="font-medium text-gray-900 shrink-0 ml-2">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full"
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {item.entryCount}건
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
