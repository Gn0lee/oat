"use client";

import { BarChart3, Receipt, Settings, Wallet } from "lucide-react";
import { AnalysisCard } from "@/components/dashboard/AnalysisCard";

const navItems = [
  {
    icon: BarChart3,
    label: "보유 현황",
    description: "어떤 주식을 갖고 있는지 확인해 보세요",
    href: "/assets/stock/holdings",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    icon: Receipt,
    label: "거래 내역",
    description: "지금까지의 매수·매도 기록을 확인해 보세요",
    href: "/assets/stock/transactions",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    icon: Wallet,
    label: "계좌 관리",
    description: "증권 계좌를 등록하고 관리해 보세요",
    href: "/assets/stock/accounts",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  {
    icon: Settings,
    label: "종목 설정",
    description: "종목을 내 방식대로 관리해 보세요",
    href: "/assets/stock/settings",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
];

export function PortfolioNavSection() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">관리</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {navItems.map((item) => (
          <AnalysisCard key={item.href} {...item} />
        ))}
      </div>
    </section>
  );
}
