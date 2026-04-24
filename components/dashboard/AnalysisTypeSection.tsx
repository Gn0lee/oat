"use client";

import { type AssetType, BASE_ASSET_TYPE_CONFIG } from "@/lib/constants/assets";
import { AnalysisCard } from "./AnalysisCard";

const ANALYSIS_TYPES: Array<{
  type: AssetType;
  description: string;
  href: string;
  disabled: boolean;
}> = [
  {
    type: "stock",
    description: "종목별 비중과 수익률을 분석하세요",
    href: "/dashboard/stocks",
    disabled: false,
  },
  {
    type: "cash",
    description: "예금, 적금, CMA 등 분석",
    href: "/dashboard/cash",
    disabled: true,
  },
  {
    type: "real-estate",
    description: "부동산 자산 분석",
    href: "/dashboard/real-estate",
    disabled: true,
  },
  {
    type: "other",
    description: "금, 코인 등 기타 자산 분석",
    href: "/dashboard/other",
    disabled: true,
  },
];

export function AnalysisTypeSection() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">자산 유형별 분석</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ANALYSIS_TYPES.map((item) => {
          const baseConfig = BASE_ASSET_TYPE_CONFIG[item.type];
          return (
            <AnalysisCard
              key={item.type}
              icon={baseConfig.icon}
              label={baseConfig.label}
              description={item.description}
              href={item.href}
              color={baseConfig.color}
              bgColor={baseConfig.bgColor}
              disabled={item.disabled}
            />
          );
        })}
      </div>
    </div>
  );
}
