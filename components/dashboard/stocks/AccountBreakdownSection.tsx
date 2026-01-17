"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
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

const CHART_COLORS = [
  "#4F46E5",
  "#03B26C",
  "#FF9F00",
  "#F04452",
  "#6366F1",
  "#EC4899",
  "#3182F6",
  "#8B95A1", // 미배정용
];

export function AccountBreakdownSection() {
  const { data, isLoading } = useStockAnalysis();
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [hoveredAccountId, setHoveredAccountId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // 초기 선택: 모든 계좌를 기본으로 보여줌
  useEffect(() => {
    if (data?.byAccount && selectedAccountIds.length === 0) {
      setSelectedAccountIds(
        data.byAccount.map((a) => a.accountId ?? "unassigned"),
      );
    }
  }, [data, selectedAccountIds.length]);

  const processedData = useMemo(() => {
    if (!data || data.byAccount.length === 0) return [];

    const selectedItems = data.byAccount.filter((a) =>
      selectedAccountIds.includes(a.accountId ?? "unassigned"),
    );
    const unselectedItems = data.byAccount.filter(
      (a) => !selectedAccountIds.includes(a.accountId ?? "unassigned"),
    );

    const result = selectedItems.map((a, index) => ({
      id: a.accountId ?? "unassigned",
      name: a.accountName ?? "미배정",
      ownerName: a.accountOwnerName,
      value: a.totalValue,
      percentage: a.percentage,
      returnRate: a.returnRate,
      holdingCount: a.holdingCount,
      fill: a.accountId
        ? CHART_COLORS[index % (CHART_COLORS.length - 1)]
        : CHART_COLORS[CHART_COLORS.length - 1],
    }));

    if (unselectedItems.length > 0) {
      const otherValue = unselectedItems.reduce(
        (sum, a) => sum + a.totalValue,
        0,
      );
      const otherPercentage = unselectedItems.reduce(
        (sum, a) => sum + a.percentage,
        0,
      );
      const otherHoldingCount = unselectedItems.reduce(
        (sum, a) => sum + a.holdingCount,
        0,
      );

      // 수익률 가중평균
      const otherInvested = unselectedItems.reduce(
        (sum, a) => sum + a.totalInvested,
        0,
      );
      const otherReturn = unselectedItems.reduce(
        (sum, a) => sum + (a.totalValue - a.totalInvested),
        0,
      );

      result.push({
        id: "OTHER",
        name: `기타 계좌 (${unselectedItems.length})`,
        ownerName: null,
        value: otherValue,
        percentage: otherPercentage,
        returnRate: otherInvested > 0 ? (otherReturn / otherInvested) * 100 : 0,
        holdingCount: otherHoldingCount,
        fill: "#E5E7EB",
      });
    }

    return result.sort((a, b) => b.value - a.value);
  }, [data, selectedAccountIds]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const item of processedData) {
      config[item.id] = {
        label: item.name,
        color: item.fill,
      };
    }
    return config;
  }, [processedData]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm min-h-[400px]">
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="flex flex-col md:flex-row gap-6">
            <div className="size-48 bg-gray-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.byAccount.length === 0) return null;

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900">계좌별 비중</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            선택한 계좌 외에는 기타로 그룹화됩니다.
          </p>
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full sm:w-[240px] justify-between text-xs h-9 rounded-xl border-gray-100 bg-gray-50/30 font-medium"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Search className="size-3.5 shrink-0 text-gray-400" />
                <span className="truncate">
                  {selectedAccountIds.length === data.byAccount.length
                    ? "모든 계좌 선택됨"
                    : `${selectedAccountIds.length}개 계좌 선택됨`}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[300px] p-0 rounded-2xl overflow-hidden shadow-2xl border-none"
            align="end"
          >
            <Command>
              <CommandInput
                placeholder="계좌명 또는 소유자 검색..."
                className="h-11"
              />
              <CommandList>
                <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                <CommandGroup>
                  {data.byAccount.map((account) => {
                    const id = account.accountId ?? "unassigned";
                    return (
                      <CommandItem
                        key={id}
                        value={`${account.accountName} ${account.accountOwnerName} ${account.broker}`}
                        onSelect={() => toggleAccount(id)}
                        className="cursor-pointer py-2.5 px-3"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex size-4 items-center justify-center rounded-md border",
                                selectedAccountIds.includes(id)
                                  ? "bg-indigo-600 border-indigo-600"
                                  : "border-gray-200",
                              )}
                            >
                              <Check
                                className={cn(
                                  "size-3 text-white",
                                  selectedAccountIds.includes(id)
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-gray-900">
                                  {account.accountName ?? "미배정"}
                                </span>
                                {account.accountOwnerName && (
                                  <Badge
                                    variant="outline"
                                    className="px-1 py-0 h-4 text-[9px] font-normal border-gray-100"
                                  >
                                    {account.accountOwnerName}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 uppercase font-medium">
                                {account.broker || "-"}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-400 font-bold">
                            {account.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* 도넛 차트 */}
        <div className="shrink-0 flex items-center justify-center">
          <ChartContainer config={chartConfig} className="size-48">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(_value, _name, item) => (
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">
                            {item.payload.name}
                          </span>
                          {item.payload.ownerName && (
                            <span className="text-[10px] text-gray-400">
                              {item.payload.ownerName}
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-indigo-600">
                          {item.payload.percentage.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Pie
                data={processedData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={85}
                strokeWidth={2}
                stroke="#fff"
                onMouseEnter={(_, index) =>
                  setHoveredAccountId(processedData[index]?.id ?? null)
                }
                onMouseLeave={() => setHoveredAccountId(null)}
              >
                {processedData.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={entry.fill}
                    style={{
                      filter:
                        hoveredAccountId && hoveredAccountId !== entry.id
                          ? "grayscale(0.6) opacity(0.4)"
                          : "none",
                      transition: "all 0.3s ease",
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>

        {/* 범례 리스트 */}
        <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
          <AnimatePresence mode="popLayout" initial={false}>
            {processedData.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={item.id}
                onMouseEnter={() => setHoveredAccountId(item.id)}
                onMouseLeave={() => setHoveredAccountId(null)}
                className={cn(
                  "flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer",
                  hoveredAccountId === item.id
                    ? "bg-gray-50 translate-x-1"
                    : "hover:bg-gray-50/50",
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="size-2 rounded-full shrink-0 ring-4 ring-white shadow-sm"
                    style={{ backgroundColor: item.fill }}
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-900">
                        {item.name}
                      </span>
                      {item.ownerName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white border border-gray-100 text-gray-500 font-bold">
                          {item.ownerName}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 font-medium">
                      {item.holdingCount}종목
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(item.value, "KRW")}
                  </span>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span
                      className={cn(
                        "text-[10px] font-bold",
                        item.returnRate >= 0
                          ? "text-[#F04452]"
                          : "text-[#3182F6]",
                      )}
                    >
                      {formatPercent(item.returnRate)}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
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
