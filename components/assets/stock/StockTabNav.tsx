import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface StockTabNavProps {
  activeTab: "holdings" | "transactions";
}

const TABS = [
  { key: "holdings", label: "보유 현황", href: "/assets/stock/holdings" },
  {
    key: "transactions",
    label: "거래 내역",
    href: "/assets/stock/transactions",
  },
] as const;

export function StockTabNav({ activeTab }: StockTabNavProps) {
  return (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "flex-1 py-2 text-center text-sm font-medium rounded-lg transition-all",
            activeTab === tab.key
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
