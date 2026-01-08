"use client";

import {
  ChevronRight,
  Home,
  type LucideIcon,
  Package,
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
  href: string;
}

const ASSET_TYPE_CONFIG: Record<AssetType, AssetTypeConfig> = {
  stock: {
    icon: TrendingUp,
    label: "주식/ETF",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    href: "/assets/stock/holdings",
  },
  cash: {
    icon: Wallet,
    label: "현금/예적금",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    href: "/assets/cash",
  },
  "real-estate": {
    icon: Home,
    label: "부동산",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    href: "/assets/real-estate",
  },
  other: {
    icon: Package,
    label: "기타",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    href: "/assets/other",
  },
};

interface AssetTypeListItemProps {
  type: AssetType;
  holdingCount?: number;
  totalValue?: number;
  returnRate?: number;
  disabled?: boolean;
  isLoading?: boolean;
}

export function AssetTypeListItem({
  type,
  holdingCount = 0,
  totalValue = 0,
  returnRate = 0,
  disabled = false,
  isLoading = false,
}: AssetTypeListItemProps) {
  const config = ASSET_TYPE_CONFIG[type];
  const Icon = config.icon;

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex items-center gap-4 px-4 py-4">
        <div className="animate-pulse">
          <div className="w-10 h-10 bg-gray-200 rounded-xl" />
        </div>
        <div className="flex-1 animate-pulse space-y-2">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
        </div>
        <div className="animate-pulse">
          <div className="h-5 w-24 bg-gray-200 rounded" />
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
        className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors"
      >
        {/* 아이콘 */}
        <div className={cn("p-2.5 rounded-xl", config.bgColor)}>
          <Icon className={cn("w-5 h-5", config.color)} />
        </div>

        {/* 라벨 */}
        <div className="flex-1 text-left">
          <p className="font-medium text-gray-900">{config.label}</p>
        </div>

        {/* 준비 중 */}
        <span className="text-sm text-gray-400">준비 중</span>
        <ChevronRight className="w-5 h-5 text-gray-300" />
      </button>
    );
  }

  // 활성 상태
  const isPositive = returnRate >= 0;
  const isEmpty = holdingCount === 0;

  return (
    <Link
      href={config.href}
      className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors"
    >
      {/* 아이콘 */}
      <div className={cn("p-2.5 rounded-xl", config.bgColor)}>
        <Icon className={cn("w-5 h-5", config.color)} />
      </div>

      {/* 라벨 + 부가정보 */}
      <div className="flex-1">
        <p className="font-medium text-gray-900">{config.label}</p>
        {isEmpty ? (
          <p className="text-sm text-gray-400">아직 등록된 자산이 없어요</p>
        ) : (
          <p className="text-sm text-gray-500">
            {holdingCount}종목
            <span className="mx-1.5 text-gray-300">·</span>
            <span className={isPositive ? "text-rose-500" : "text-blue-500"}>
              {formatPercent(returnRate)}
            </span>
          </p>
        )}
      </div>

      {/* 금액 또는 시작하기 */}
      {isEmpty ? (
        <span className="text-sm text-indigo-600 font-medium">시작하기</span>
      ) : (
        <p className="text-lg font-semibold text-gray-900">
          {formatCurrency(totalValue)}
        </p>
      )}
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </Link>
  );
}

// 기존 AssetTypeCard도 export (하위 호환성)
export { AssetTypeListItem as AssetTypeCard };
