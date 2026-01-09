"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { RiskAssetList } from "@/components/dashboard/by-risk";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { RISK_LEVEL_LABELS } from "@/constants/enums";
import { useByRiskAnalysis } from "@/hooks/use-by-risk-analysis";
import { formatCurrency } from "@/lib/utils/format";
import type { RiskLevel } from "@/types";

// 위험도 차트 색상 (HEX)
const RISK_LEVEL_CHART_COLORS: Record<RiskLevel | "null", string> = {
  safe: "#03B26C",
  moderate: "#FF9F00",
  aggressive: "#F04452",
  null: "#8B95A1",
};

// 위험도 표시 순서 (안전 → 중립 → 공격 → 미설정)
const RISK_LEVEL_ORDER: (RiskLevel | null)[] = [
  "safe",
  "moderate",
  "aggressive",
  null,
];

function getRiskLevelLabel(riskLevel: RiskLevel | null): string {
  return riskLevel ? RISK_LEVEL_LABELS[riskLevel] : "미설정";
}

function getRiskLevelColor(riskLevel: RiskLevel | null): string {
  return RISK_LEVEL_CHART_COLORS[riskLevel ?? "null"];
}

export default function ByRiskAnalysisPage() {
  const { data, isLoading, error } = useByRiskAnalysis();

  // 위험도 순서대로 정렬된 데이터
  const sortedByRiskLevel = useMemo(() => {
    if (!data?.byRiskLevel) return [];
    return [...data.byRiskLevel].sort((a, b) => {
      const aIndex = RISK_LEVEL_ORDER.indexOf(a.riskLevel);
      const bIndex = RISK_LEVEL_ORDER.indexOf(b.riskLevel);
      return aIndex - bIndex;
    });
  }, [data?.byRiskLevel]);

  // 차트 데이터
  const chartData = useMemo(() => {
    return sortedByRiskLevel.map((risk) => ({
      name: getRiskLevelLabel(risk.riskLevel),
      riskLevel: risk.riskLevel ?? "null",
      value: risk.totalValue,
      percentage: risk.percentage,
      fill: getRiskLevelColor(risk.riskLevel),
    }));
  }, [sortedByRiskLevel]);

  // 차트 설정
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const item of chartData) {
      config[item.riskLevel] = {
        label: item.name,
        color: item.fill,
      };
    }
    return config;
  }, [chartData]);

  const isEmpty = !isLoading && (!data || data.totalValue === 0);

  return (
    <>
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">위험도별 분석</h1>
          <p className="text-sm text-gray-500">안전/중립/공격 자산 비중</p>
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
              <div className="flex gap-6">
                <div className="size-48 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-6 bg-gray-200 rounded" />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-5 w-20 bg-gray-200 rounded" />
                  <div className="h-4 w-full bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            데이터를 불러오는데 실패했습니다.
          </p>
        </div>
      )}

      {/* 빈 상태 */}
      {isEmpty && !error && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <p className="text-gray-500">아직 보유 종목이 없습니다.</p>
          <p className="text-sm text-gray-400 mt-1">
            거래를 등록하면 위험도별 비중을 확인할 수 있어요
          </p>
        </div>
      )}

      {/* 데이터 표시 */}
      {!isLoading && !error && chartData.length > 0 && (
        <div className="space-y-4">
          {/* 위험도별 비중 차트 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              위험도별 비중
            </h3>
            <div className="flex flex-col md:flex-row gap-6">
              {/* 도넛 차트 */}
              <div className="flex-shrink-0 mx-auto md:mx-0">
                <ChartContainer config={chartConfig} className="size-48">
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(_value, _name, item) => (
                            <div className="flex items-center justify-between gap-4">
                              <span>{item.payload.name}</span>
                              <span className="font-mono font-medium">
                                {item.payload.percentage.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      strokeWidth={2}
                      stroke="#fff"
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.riskLevel} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </div>

              {/* 범례 리스트 */}
              <div className="flex-1 space-y-3">
                {chartData.map((item) => (
                  <div
                    key={item.riskLevel}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="size-3 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.value, "KRW")}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 위험도별 종목 리스트 */}
          <RiskAssetList data={sortedByRiskLevel} />
        </div>
      )}
    </>
  );
}
