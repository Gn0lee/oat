"use client";

import Link from "next/link";
import { toast } from "sonner";
import { type AssetType, BASE_ASSET_TYPE_CONFIG } from "@/lib/constants/assets";
import { cn } from "@/lib/utils/cn";

interface AssetTypeConfig {
  href: string;
  description: string;
}

const ASSET_TYPE_EXTRAS: Record<AssetType, AssetTypeConfig> = {
  stock: {
    href: "/assets/stock",
    description: "국내외 주식 보유 현황과 수익률을 한눈에 확인하세요",
  },
  cash: {
    href: "/assets/accounts",
    description: "은행 입출금, 예적금, 투자 계좌 등을 관리하세요",
  },
  "real-estate": {
    href: "/assets/real-estate",
    description: "아파트, 토지 등 부동산 자산을 기록하세요",
  },
  other: {
    href: "/assets/other",
    description: "금, 코인, 자동차 등 기타 자산을 추가하세요",
  },
};

interface AssetSummaryCardProps {
  type: AssetType;
  disabled?: boolean;
}

function AssetSummaryCard({ type, disabled = false }: AssetSummaryCardProps) {
  const baseConfig = BASE_ASSET_TYPE_CONFIG[type];
  const extraConfig = ASSET_TYPE_EXTRAS[type];
  const Icon = baseConfig.icon;

  // 비활성 상태 (준비 중)
  if (disabled) {
    const handleClick = () => {
      toast.info(`${baseConfig.label} 기능은 준비 중이에요`, {
        description: "조금만 기다려주세요!",
      });
    };

    return (
      <button
        type="button"
        onClick={handleClick}
        className="w-full text-left bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow opacity-80 hover:opacity-100"
      >
        <div className={cn("p-2.5 rounded-xl w-fit mb-3", baseConfig.bgColor)}>
          <Icon className={cn("w-5 h-5", baseConfig.color)} />
        </div>
        <p className="font-medium text-gray-900 mb-1">{baseConfig.label}</p>
        <p className="text-sm text-gray-500 leading-relaxed">
          {extraConfig.description}
        </p>
      </button>
    );
  }

  // 활성 상태
  return (
    <Link
      href={extraConfig.href}
      className="block bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className={cn("p-2.5 rounded-xl w-fit mb-3", baseConfig.bgColor)}>
        <Icon className={cn("w-5 h-5", baseConfig.color)} />
      </div>
      <p className="font-medium text-gray-900 mb-1">{baseConfig.label}</p>
      <p className="text-sm text-gray-500 leading-relaxed">
        {extraConfig.description}
      </p>
    </Link>
  );
}

export function AssetTypeSummary() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">자산 유형</h2>
        <Link
          href="/assets"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          전체 보기
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AssetSummaryCard type="stock" />
        <AssetSummaryCard type="cash" />
        <AssetSummaryCard type="real-estate" disabled />
        <AssetSummaryCard type="other" disabled />
      </div>
    </div>
  );
}
