"use client";

import { PieChart, Shield, Users } from "lucide-react";
import { AnalysisCard } from "./AnalysisCard";

const BREAKDOWN_TYPES = [
  {
    type: "by-owner",
    icon: Users,
    label: "소유자별",
    description: "가족 구성원별 자산 비중을 확인하세요",
    href: "/dashboard/by-owner",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    disabled: false,
  },
  {
    type: "by-risk",
    icon: Shield,
    label: "위험도별",
    description: "안전/중립/공격 자산 비중 분석",
    href: "/dashboard/by-risk",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    disabled: false,
  },
  {
    type: "by-asset-type",
    icon: PieChart,
    label: "자산군별",
    description: "주식, 채권, 현금 등 자산군 비중",
    href: "/dashboard/by-asset-type",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    disabled: false,
  },
] as const;

export function BreakdownSection() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">비중 분석</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {BREAKDOWN_TYPES.map((item) => (
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
