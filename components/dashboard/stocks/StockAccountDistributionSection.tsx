"use client";

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
import { formatCurrency } from "@/lib/utils/format";

const CHART_COLORS = [
  "#4F46E5", // 인디고
  "#03B26C", // 초록
  "#FF9F00", // 주황
  "#F04452", // 빨강
  "#6366F1", // 보라
  "#8B95A1", // 회색 (미배정용)
];

export function StockAccountDistributionSection() {
  const { data, isLoading } = useStockAnalysis();
  const [selectedTicker, setSelectedTicker] = useState<string>("");

  // 종목 목록 (중복 제거, 종목명 기준 정렬)
  const stockOptions = useMemo(() => {
    if (!data) return [];

    const tickerMap = new Map<string, string>();
    for (const holding of data.holdings) {
      if (!tickerMap.has(holding.ticker)) {
        tickerMap.set(holding.ticker, holding.name);
      }
    }

    return Array.from(tickerMap.entries())
      .map(([ticker, name]) => ({ ticker, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [data]);

  // 선택된 종목의 계좌별 분포
  const distributionData = useMemo(() => {
    if (!data || !selectedTicker) return [];

    // 선택된 종목의 holdings 필터링
    const selectedHoldings = data.holdings.filter(
      (h) => h.ticker === selectedTicker,
    );

    if (selectedHoldings.length === 0) return [];

    // 계좌별로 그룹핑
    const accountMap = new Map<
      string | null,
      {
        name: string | null;
        ownerName: string | null;
        quantity: number;
        value: number;
      }
    >();

    for (const holding of selectedHoldings) {
      const accountId = holding.account.id;
      const existing = accountMap.get(accountId);

      if (existing) {
        existing.quantity += holding.quantity;
        existing.value += holding.currentValue;
      } else {
        accountMap.set(accountId, {
          name: holding.account.name,
          ownerName: holding.account.ownerName,
          quantity: holding.quantity,
          value: holding.currentValue,
        });
      }
    }

    // 총 가치 계산
    const totalValue = Array.from(accountMap.values()).reduce(
      (sum, item) => sum + item.value,
      0,
    );

    // 차트 데이터 생성
    return Array.from(accountMap.entries())
      .map(([accountId, data], index) => ({
        id: accountId ?? "unassigned",
        name: data.name ?? "미배정",
        ownerName: data.ownerName,
        quantity: data.quantity,
        value: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        fill: accountId
          ? CHART_COLORS[index % (CHART_COLORS.length - 1)]
          : CHART_COLORS[CHART_COLORS.length - 1],
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, selectedTicker]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const item of distributionData) {
      config[item.id] = {
        label: item.name,
        color: item.fill,
      };
    }
    return config;
  }, [distributionData]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
          <div className="h-9 w-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!data || stockOptions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-medium text-gray-900 mb-4">
        종목별 계좌 분포
      </h3>

      {/* 종목 선택 */}
      <div className="mb-6">
        <Select value={selectedTicker} onValueChange={setSelectedTicker}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue placeholder="종목을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {stockOptions.map((stock) => (
              <SelectItem key={stock.ticker} value={stock.ticker}>
                {stock.name} ({stock.ticker})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 선택된 종목의 계좌별 분포 */}
      {selectedTicker && distributionData.length > 0 ? (
        <div className="flex flex-col md:flex-row gap-6">
          {/* 도넛 차트 */}
          <div className="shrink-0">
            <ChartContainer config={chartConfig} className="size-48">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(_value, _name, item) => (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-col">
                            <span>{item.payload.name}</span>
                            {item.payload.ownerName && (
                              <span className="text-[10px] text-gray-400">
                                {item.payload.ownerName}
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-medium">
                            {item.payload.percentage.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={distributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {distributionData.map((entry) => (
                    <Cell key={entry.id} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>

          {/* 범례 리스트 */}
          <div className="flex-1 space-y-3">
            {distributionData.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">
                      {item.name}
                    </span>
                    {item.ownerName && (
                      <span className="text-[10px] text-gray-500">
                        {item.ownerName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {item.quantity.toLocaleString()}주
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-xs text-gray-600">
                      {formatCurrency(item.value, "KRW")}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : selectedTicker ? (
        <p className="text-sm text-gray-500 text-center py-8">
          선택한 종목의 계좌 분포 데이터가 없습니다.
        </p>
      ) : (
        <p className="text-sm text-gray-500 text-center py-8">
          종목을 선택하면 계좌별 분포를 확인할 수 있습니다.
        </p>
      )}
    </div>
  );
}
