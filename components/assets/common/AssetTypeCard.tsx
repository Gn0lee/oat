"use client";

import {
  ChevronRight,
  Home,
  type LucideIcon,
  Package,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

export type AssetType = "stock" | "cash" | "real-estate" | "other";

interface AssetTypeConfig {
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
}

const ASSET_TYPE_CONFIG: Record<AssetType, AssetTypeConfig> = {
  stock: {
    icon: TrendingUp,
    label: "주식/ETF",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  cash: {
    icon: Wallet,
    label: "현금/예적금",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  "real-estate": {
    icon: Home,
    label: "부동산",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
  },
  other: {
    icon: Package,
    label: "기타",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
};

interface AssetTypeCardProps {
  type: AssetType;
  holdingCount?: number;
  totalValue?: number;
  returnRate?: number;
  disabled?: boolean;
  isLoading?: boolean;
}

export function AssetTypeCard({
  type,
  holdingCount = 0,
  totalValue = 0,
  returnRate = 0,
  disabled = false,
  isLoading = false,
}: AssetTypeCardProps) {
  const config = ASSET_TYPE_CONFIG[type];
  const Icon = config.icon;

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gray-200 rounded-xl" />
            <div className="h-5 w-16 bg-gray-200 rounded" />
          </div>
          <div className="h-6 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // 비활성 상태 (준비 중)
  if (disabled) {
    const handleDisabledClick = () => {
      toast.info(`${config.label} 기능은 준비 중이에요`, {
        description: "조금만 기다려주세요!",
      });
    };

    return (
      <button
        type="button"
        onClick={handleDisabledClick}
        className="w-full text-left bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow opacity-80 hover:opacity-100"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className={cn("p-2 rounded-xl", config.bgColor)}>
            <Icon className={cn("w-5 h-5", config.color)} />
          </div>
          <span className="font-medium text-gray-900">{config.label}</span>
        </div>
        <p className="text-sm text-gray-500">준비 중</p>
      </button>
    );
  }

  // 활성 상태 (주식 카드)
  const isPositive = returnRate >= 0;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* 헤더: 아이콘 + 라벨 */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("p-2 rounded-xl", config.bgColor)}>
          <Icon className={cn("w-5 h-5", config.color)} />
        </div>
        <span className="font-medium text-gray-900">{config.label}</span>
      </div>

      {/* 총 평가금액 */}
      <p className="text-xl font-bold text-gray-900 mb-1">
        {formatCurrency(totalValue)}
      </p>

      {/* 보유 종목 수 + 수익률 */}
      <div className="flex items-center gap-2 text-sm mb-4 whitespace-nowrap">
        <span className="text-gray-500">{holdingCount}종목</span>
        <span className="text-gray-300">·</span>
        <span className={isPositive ? "text-rose-500" : "text-blue-500"}>
          {formatPercent(returnRate)}
        </span>
      </div>

      {/* 바로가기 버튼 */}
      <div className="flex gap-2">
        <Link
          href="/assets/stock/holdings"
          className="flex-1 flex items-center justify-center gap-1 py-2 px-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors whitespace-nowrap"
        >
          보유
          <ChevronRight className="w-4 h-4 shrink-0" />
        </Link>
        <Link
          href="/assets/stock/transactions"
          className="flex-1 flex items-center justify-center gap-1 py-2 px-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors whitespace-nowrap"
        >
          거래
          <ChevronRight className="w-4 h-4 shrink-0" />
        </Link>
        <Link
          href="/assets/stock/settings"
          className="flex items-center justify-center p-2 text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 hover:text-gray-700 transition-colors"
          title="종목 설정"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
