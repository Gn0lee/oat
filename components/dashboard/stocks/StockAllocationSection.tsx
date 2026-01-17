"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStockAnalysis } from "@/hooks/use-stock-analysis";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

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

type SortKey = "value" | "name" | "return";

export function StockAllocationSection() {
  const { data, isLoading } = useStockAnalysis();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("value");
  const [hoveredTicker, setHoveredTicker] = useState<string | null>(null);

  const filteredAndSortedData = useMemo(() => {
    if (!data || !data.byTicker) return [];

    let result = [...data.byTicker];

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(query) ||
          h.ticker.toLowerCase().includes(query),
      );
    }

    // 정렬
    result.sort((a, b) => {
      if (sortBy === "value") return b.currentValue - a.currentValue;
      if (sortBy === "name") return a.name.localeCompare(b.name, "ko");
      if (sortBy === "return") return b.returnRate - a.returnRate;
      return 0;
    });

    return result.map((h, index) => ({
      ...h,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [data, searchQuery, sortBy]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const item of filteredAndSortedData) {
      config[item.ticker] = {
        label: item.name,
        color: item.fill,
      };
    }
    return config;
  }, [filteredAndSortedData]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm min-h-[400px]">
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="flex flex-col md:flex-row gap-6">
            <div className="size-48 bg-gray-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.byTicker.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-medium text-gray-900">종목별 비중</h3>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="value">비중순</SelectItem>
              <SelectItem value="name">이름순</SelectItem>
              <SelectItem value="return">수익률순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
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
                  data={filteredAndSortedData}
                  dataKey="currentValue"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={95}
                  strokeWidth={2}
                  stroke="#fff"
                  paddingAngle={2}
                  onMouseEnter={(_, index) =>
                    setHoveredTicker(filteredAndSortedData[index].ticker)
                  }
                  onMouseLeave={() => setHoveredTicker(null)}
                >
                  {filteredAndSortedData.map((entry) => (
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
              <span className="text-xs text-gray-400 font-medium">전체</span>
              <span className="text-lg font-bold text-gray-900">
                {data.byTicker.length}
                <span className="text-sm font-normal ml-0.5">종목</span>
              </span>
            </div>
          </div>
        </div>

        {/* 범례 및 검색 */}
        <div className="flex-1 flex flex-col min-w-0 h-[320px]">
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="종목명 또는 티커 검색"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-100 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {filteredAndSortedData.map((item) => {
                  const isPositive = item.returnRate >= 0;
                  const returnColor = isPositive
                    ? "rgba(240, 68, 82, 0.04)"
                    : "rgba(49, 130, 246, 0.04)";
                  const isHovered = hoveredTicker === item.ticker;

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={item.ticker}
                      onMouseEnter={() => setHoveredTicker(item.ticker)}
                      onMouseLeave={() => setHoveredTicker(null)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
                        isHovered
                          ? "bg-gray-50 translate-x-1"
                          : "hover:bg-gray-50/50"
                      }`}
                      style={{
                        backgroundColor: isHovered ? undefined : returnColor,
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="size-2 rounded-full shrink-0 ring-4 ring-white"
                          style={{ backgroundColor: item.fill }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">
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
                            className={`text-[11px] font-bold ${
                              isPositive ? "text-[#F04452]" : "text-[#3182F6]"
                            }`}
                          >
                            {isPositive ? "+" : ""}
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
    </div>
  );
}
