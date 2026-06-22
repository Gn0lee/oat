"use client";

import { startOfMonth } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
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
import { getKstNow } from "@/lib/date";
import { formatCurrency } from "@/lib/utils/format";
import { LedgerStatsDetailDrawer } from "./LedgerStatsDetailDrawer";
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

interface ByCategoryClientProps {
  scope: StatsScope;
}

export function ByCategoryClient({ scope }: ByCategoryClientProps) {
  const shouldReduceMotion = useReducedMotion();
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    startOfMonth(getKstNow()),
  );
  const [entryType, setEntryType] = useState<"expense" | "income">("expense");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(
    null,
  );
  const [detail, setDetail] = useState<{
    title: string;
    categoryId: string;
    childCategoryId?: string;
    categoryBreakdown?: "direct";
    expectedCount: number;
  } | null>(null);

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
        directAmount: others.reduce((s, o) => s + (o.directAmount ?? 0), 0),
        directEntryCount: others.reduce(
          (s, o) => s + (o.directEntryCount ?? 0),
          0,
        ),
        children: [],
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
              <div className="flex border-b border-gray-100">
                {(["expense", "income"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setEntryType(type);
                      setSelectedIds([]);
                    }}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      entryType === type
                        ? "text-primary border-b-2 border-primary"
                        : "text-gray-400"
                    }`}
                  >
                    {type === "expense" ? "지출" : "수입"}
                  </button>
                ))}
              </div>
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
            className="h-[200px] w-full"
          >
            <BarChart
              data={comparisonData}
              layout="vertical"
              margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
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
                width={72}
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
            {data.items.map((item) => {
              const categoryId = item.categoryId ?? "__none__";
              const children = item.children ?? [];
              const hasChildren = children.length > 0;
              const isExpanded = expandedCategoryId === categoryId;
              const breakdownId = `category-breakdown-${categoryId}`;
              const parentPercentage = (amount: number) =>
                item.amount > 0
                  ? ((amount / item.amount) * 100).toFixed(1)
                  : "0.0";

              return (
                <li key={item.categoryId ?? "null"} className="space-y-2">
                  <button
                    type="button"
                    aria-expanded={hasChildren ? isExpanded : undefined}
                    aria-controls={hasChildren ? breakdownId : undefined}
                    onClick={() => {
                      if (hasChildren) {
                        setExpandedCategoryId((current) =>
                          current === categoryId ? null : categoryId,
                        );
                        return;
                      }
                      setDetail({
                        title: `${item.categoryName} 기록`,
                        categoryId,
                        expectedCount: item.entryCount,
                      });
                    }}
                    className="flex w-full items-center gap-3 rounded-lg py-1 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <CategoryIcon
                        iconName={item.categoryIcon}
                        className="w-4 h-4 text-gray-600"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-between py-1">
                      <span className="truncate text-sm text-gray-700">
                        {item.categoryName}
                      </span>
                      <span className="ml-2 flex shrink-0 items-center gap-1.5">
                        <span className="text-right">
                          <span className="block text-sm font-medium text-gray-900">
                            {formatCurrency(item.amount)}
                          </span>
                          <span className="block text-xs text-gray-400">
                            {item.entryCount}건
                          </span>
                        </span>
                        {hasChildren && (
                          <ChevronDown
                            className={`size-4 text-gray-400 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            aria-hidden="true"
                          />
                        )}
                        {!hasChildren && (
                          <ChevronRight
                            className="size-4 text-gray-400"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {hasChildren && isExpanded && (
                      <motion.div
                        id={breakdownId}
                        initial={
                          shouldReduceMotion ? false : { height: 0, opacity: 0 }
                        }
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                        className="ml-11 overflow-hidden border-l border-gray-200 pl-4"
                      >
                        <div className="space-y-1">
                          {(item.directEntryCount ?? 0) > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setDetail({
                                  title: `${item.categoryName} 직접 기록`,
                                  categoryId,
                                  categoryBreakdown: "direct",
                                  expectedCount: item.directEntryCount ?? 0,
                                })
                              }
                              className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left hover:bg-gray-50"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm text-gray-700">
                                  {item.categoryName}로 기록
                                </span>
                                <span className="block text-xs text-gray-400">
                                  {item.categoryName}의{" "}
                                  {parentPercentage(item.directAmount ?? 0)}% ·{" "}
                                  {item.directEntryCount}건
                                </span>
                              </span>
                              <span className="shrink-0 text-sm font-medium text-gray-900">
                                {formatCurrency(item.directAmount ?? 0)}
                              </span>
                            </button>
                          )}

                          {children.map((child) => (
                            <button
                              key={child.categoryId}
                              type="button"
                              onClick={() =>
                                setDetail({
                                  title: `${item.categoryName} > ${child.categoryName} 기록`,
                                  categoryId,
                                  childCategoryId: child.categoryId,
                                  expectedCount: child.entryCount,
                                })
                              }
                              className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left hover:bg-gray-50"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm text-gray-700">
                                  {child.categoryName}
                                </span>
                                <span className="block text-xs text-gray-400">
                                  {item.categoryName}의{" "}
                                  {parentPercentage(child.amount)}% ·{" "}
                                  {child.entryCount}건
                                </span>
                              </span>
                              <span className="shrink-0 text-sm font-medium text-gray-900">
                                {formatCurrency(child.amount)}
                              </span>
                            </button>
                          ))}

                          <button
                            type="button"
                            onClick={() =>
                              setDetail({
                                title: `${item.categoryName} 기록`,
                                categoryId,
                                expectedCount: item.entryCount,
                              })
                            }
                            className="mt-1 flex w-full items-center justify-between border-t border-gray-100 px-2 py-2 text-xs font-medium text-gray-600 hover:text-gray-900"
                          >
                            전체 {item.entryCount}건 보기
                            <ChevronRight
                              className="size-4"
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <LedgerStatsDetailDrawer
        open={!!detail}
        title={detail?.title ?? ""}
        expectedCount={detail?.expectedCount}
        params={
          detail
            ? {
                kind: "category",
                year,
                month,
                type: entryType,
                scope,
                categoryId: detail.categoryId,
                childCategoryId: detail.childCategoryId,
                categoryBreakdown: detail.categoryBreakdown,
              }
            : null
        }
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDetail(null);
        }}
      />
    </div>
  );
}
