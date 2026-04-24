import {
  Home,
  type LucideIcon,
  Package,
  TrendingUp,
  Wallet,
} from "lucide-react";

export type AssetType = "stock" | "cash" | "real-estate" | "other";

export interface BaseAssetTypeConfig {
  type: AssetType;
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
}

export const BASE_ASSET_TYPE_CONFIG: Record<AssetType, BaseAssetTypeConfig> = {
  stock: {
    type: "stock",
    icon: TrendingUp,
    label: "주식/ETF",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  cash: {
    type: "cash",
    icon: Wallet,
    label: "금융 계좌",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  "real-estate": {
    type: "real-estate",
    icon: Home,
    label: "부동산",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
  },
  other: {
    type: "other",
    icon: Package,
    label: "기타",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
};
