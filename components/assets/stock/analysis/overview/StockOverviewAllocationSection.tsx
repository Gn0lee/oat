"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { ScreenSection, SectionHeader } from "@/components/layout/screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
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
import { useStockAnalysis } from "@/hooks/use-stock-analysis";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import {
  type StockOverviewDetail,
  StockOverviewDetailDrawer,
} from "./StockOverviewDetailDrawer";

const CHART_COLORS = [
  "#4F46E5",
  "#03B26C",
  "#FF9F00",
  "#F04452",
  "#6366F1",
  "#3182F6",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#8B5CF6",
];

export function StockOverviewAllocationSection() {
  const { data, isLoading } = useStockAnalysis();
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [hoveredTicker, setHoveredTicker] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<StockOverviewDetail | null>(null);

  // 초기 선택: 모든 종목을 기본으로 보여줌
  useEffect(() => {
    if (data?.byTicker && selectedTickers.length === 0) {
      setSelectedTickers(data.byTicker.map((h) => h.ticker));
    }
  }, [data, selectedTickers.length]);

  const processedData = useMemo(() => {
    if (!data || !data.byTicker) return [];

    const selectedItems = data.byTicker.filter((h) =>
      selectedTickers.includes(h.ticker),
    );
    const unselectedItems = data.byTicker.filter(
      (h) => !selectedTickers.includes(h.ticker),
    );

    const result = selectedItems.map((h, index) => ({
      ...h,
      isOther: false,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));

    if (unselectedItems.length > 0) {
      const otherValue = unselectedItems.reduce(
        (sum, h) => sum + h.currentValue,
        0,
      );
      const otherInvested = unselectedItems.reduce(
        (sum, h) => sum + h.totalInvested,
        0,
      );
      const otherReturn = unselectedItems.reduce(
        (sum, h) => sum + h.returnAmount,
        0,
      );
      const otherAllocation = unselectedItems.reduce(
        (sum, h) => sum + h.allocationPercent,
        0,
      );

      result.push({
        ticker: "OTHER",
        name: `기타 (${unselectedItems.length})`,
        market: "OTHER" as "OTHER",
        currency: "KRW" as "KRW",
        quantity: 0,
        avgPrice: 0,
        totalInvested: otherInvested,
        currentValue: otherValue,
        returnAmount: otherReturn,
        returnRate: otherInvested > 0 ? (otherReturn / otherInvested) * 100 : 0,
        allocationPercent: otherAllocation,
        isOther: true,
        fill: "#8B95A1",
      });
    }

    return result.sort((a, b) => b.currentValue - a.currentValue);
  }, [data, selectedTickers]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const item of processedData) {
      config[item.ticker] = {
        label: item.name,
        color: item.fill,
      };
    }
    return config;
  }, [processedData]);

  if (isLoading) {
    return (
      <ScreenSection>
        <SectionHeader
          title="종목별 비중"
          description="선택한 종목 외에는 기타로 자동 그룹화됩니다."
        />
        <div className="min-h-[400px] rounded-xl bg-white p-5 ring-1 ring-gray-100">
          <div className="animate-pulse space-y-6">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="size-48 shrink-0 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-gray-200" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScreenSection>
    );
  }

  if (!data || data.byTicker.length === 0) return null;

  const toggleTicker = (ticker: string) => {
    setSelectedTickers((prev) =>
      prev.includes(ticker)
        ? prev.filter((t) => t !== ticker)
        : [...prev, ticker],
    );
  };

  return (
    <ScreenSection>
      <SectionHeader
        title="종목별 비중"
        description="선택한 종목 외에는 기타로 자동 그룹화됩니다."
        action={
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="h-9 w-full justify-between rounded-xl border-gray-100 bg-gray-50/30 font-medium text-xs hover:bg-gray-50 sm:w-[240px]"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Search className="size-3.5 shrink-0 text-gray-400" />
                  <span className="truncate">
                    {selectedTickers.length === data.byTicker.length
                      ? "모든 종목 선택됨"
                      : `${selectedTickers.length}개 종목 선택됨`}
                  </span>
                </div>
                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[300px] overflow-hidden rounded-2xl border-none p-0 shadow-2xl"
              align="end"
            >
              <Command className="border-none">
                <CommandInput
                  placeholder="종목명 또는 티커 검색..."
                  className="h-11 border-none text-sm focus:ring-0"
                />
                <CommandList className="max-h-[300px] custom-scrollbar">
                  <CommandEmpty className="py-6 text-center text-gray-400 text-sm">
                    검색 결과가 없습니다.
                  </CommandEmpty>
                  <CommandGroup>
                    {data.byTicker.map((item) => (
                      <CommandItem
                        key={item.ticker}
                        value={`${item.ticker} ${item.name}`}
                        onSelect={() => toggleTicker(item.ticker)}
                        className="cursor-pointer px-3 py-2.5 aria-selected:bg-indigo-50/50"
                      >
                        <div className="flex w-full items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex size-4 items-center justify-center rounded-md border transition-all",
                                selectedTickers.includes(item.ticker)
                                  ? "border-indigo-600 bg-indigo-600 shadow-sm"
                                  : "border-gray-200",
                              )}
                            >
                              <Check
                                className={cn(
                                  "size-3 text-white transition-opacity",
                                  selectedTickers.includes(item.ticker)
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900 text-sm">
                                {item.name}
                              </span>
                              <span className="font-medium text-[10px] text-gray-400 uppercase">
                                {item.ticker}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className="border-none bg-gray-100/50 font-medium text-[10px] text-gray-500"
                          >
                            {item.allocationPercent.toFixed(1)}%
                          </Badge>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        }
      />

      <div className="flex flex-col gap-8 rounded-xl bg-white p-4 ring-1 ring-gray-100 md:flex-row">
        {/* 도넛 차트 */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="relative">
            <ChartContainer config={chartConfig} className="size-52">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(_value, _name, item) => (
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-medium text-gray-900">
                            {item.payload.name}
                          </span>
                          <span className="font-mono font-bold text-indigo-600">
                            {item.payload.allocationPercent.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={processedData}
                  dataKey="currentValue"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={95}
                  strokeWidth={2}
                  stroke="#fff"
                  paddingAngle={2}
                  onMouseEnter={(_, index) =>
                    setHoveredTicker(processedData[index]?.ticker ?? null)
                  }
                  onMouseLeave={() => setHoveredTicker(null)}
                >
                  {processedData.map((entry) => (
                    <Cell
                      key={entry.ticker}
                      fill={entry.fill}
                      style={{
                        filter:
                          hoveredTicker && hoveredTicker !== entry.ticker
                            ? "grayscale(0.6) opacity(0.4)"
                            : "none",
                        transition: "all 0.3s ease",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-gray-400 font-medium">합계</span>
              <span className="text-lg font-bold text-gray-900">
                100<span className="text-sm font-normal ml-0.5">%</span>
              </span>
            </div>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex-1 flex flex-col min-w-0 h-[320px]">
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-1">
              <AnimatePresence mode="popLayout" initial={false}>
                {processedData.map((item) => {
                  const isPositive = item.returnRate >= 0;
                  const returnColor = isPositive
                    ? "rgba(240, 68, 82, 0.04)"
                    : "rgba(49, 130, 246, 0.04)";
                  const isHovered = hoveredTicker === item.ticker;

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={item.ticker}
                      onMouseEnter={() => setHoveredTicker(item.ticker)}
                      onMouseLeave={() => setHoveredTicker(null)}
                      onClick={() => {
                        if (!item.isOther) {
                          setDetail({
                            kind: "ticker",
                            ticker: item.ticker,
                            title: `${item.name} 보유 항목`,
                          });
                        }
                      }}
                      className={cn(
                        "group flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer",
                        isHovered
                          ? "bg-gray-50 translate-x-1"
                          : "hover:bg-gray-50/50",
                      )}
                      style={{
                        backgroundColor: isHovered ? undefined : returnColor,
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="size-2 rounded-full shrink-0 ring-4 ring-white shadow-sm"
                          style={{ backgroundColor: item.fill }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">
                            {item.ticker}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(item.currentValue, "KRW")}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <span
                            className={cn(
                              "text-[11px] font-bold",
                              isPositive ? "text-[#F04452]" : "text-[#3182F6]",
                            )}
                          >
                            {formatPercent(item.returnRate)}
                          </span>
                          <span className="text-[11px] font-medium text-gray-400">
                            ({item.allocationPercent.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
      <StockOverviewDetailDrawer
        open={!!detail}
        detail={detail}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDetail(null);
        }}
      />
    </ScreenSection>
  );
}
