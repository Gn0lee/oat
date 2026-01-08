import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-4">
      {/* 상단: 뒤로가기 + 거래 추가 버튼 */}
      <div className="flex items-center justify-between">
        <Link
          href="/assets"
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">자산</span>
        </Link>
        <Button asChild size="sm">
          <Link href="/assets/stock/transactions/new">
            <Plus className="w-4 h-4 mr-1" />
            거래 추가
          </Link>
        </Button>
      </div>

      {/* 탭 네비게이션 */}
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
    </div>
  );
}
