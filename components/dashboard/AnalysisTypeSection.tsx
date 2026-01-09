"use client";

import { Home, Package, TrendingUp, Wallet } from "lucide-react";
import { AnalysisCard } from "./AnalysisCard";

const ANALYSIS_TYPES = [
  {
    type: "stocks",
    icon: TrendingUp,
    label: "주식/ETF",
    description: "종목별 비중과 수익률을 분석하세요",
    href: "/dashboard/stocks",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    disabled: false,
  },
  {
    type: "cash",
    icon: Wallet,
    label: "현금/예적금",
    description: "예금, 적금, CMA 등 분석",
    href: "/dashboard/cash",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    disabled: true,
  },
  {
    type: "real-estate",
    icon: Home,
    label: "부동산",
    description: "부동산 자산 분석",
    href: "/dashboard/real-estate",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    disabled: true,
  },
  {
    type: "other",
    icon: Package,
    label: "기타",
    description: "금, 코인 등 기타 자산 분석",
    href: "/dashboard/other",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    disabled: true,
  },
] as const;

export function AnalysisTypeSection() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">자산 유형별 분석</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ANALYSIS_TYPES.map((item) => (
          <AnalysisCard
            key={item.type}
            icon={item.icon}
            label={item.label}
            description={item.description}
            href={item.href}
            color={item.color}
            bgColor={item.bgColor}
            disabled={item.disabled}
          />
        ))}
      </div>
    </div>
  );
}
