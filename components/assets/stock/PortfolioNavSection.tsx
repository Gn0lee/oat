"use client";

import {
  BarChart3,
  CalendarDays,
  ChartCandlestick,
  ChartPie,
  Receipt,
  Settings,
  Wallet,
} from "lucide-react";
import {
  EntryRow,
  GroupedList,
  ScreenSection,
  SectionHeader,
} from "@/components/layout/screen";

const workflowItems = [
  {
    icon: BarChart3,
    title: "보유 현황",
    description: "종목별 보유 수량과 투자금 확인",
    href: "/assets/stock/holdings",
  },
  {
    icon: Receipt,
    title: "거래 내역",
    description: "매수와 매도 기록 확인",
    href: "/assets/stock/transactions",
  },
  {
    icon: CalendarDays,
    title: "일별 기록",
    description: "날짜별 주식 거래 확인",
    href: "/assets/stock/records",
  },
  {
    icon: ChartPie,
    title: "주식 분석",
    description: "종합, 소유자별, 위험도별 분석",
    href: "/assets/stock/analysis",
  },
];

const adminItems = [
  {
    icon: Wallet,
    title: "계좌 관리",
    description: "증권 계좌 등록과 관리",
    href: "/assets/stock/accounts",
  },
  {
    icon: Settings,
    title: "종목 설정",
    description: "종목별 소유자, 계좌, 위험도 관리",
    href: "/assets/stock/settings",
  },
  {
    icon: ChartCandlestick,
    title: "시장 동향",
    description: "국내와 해외 시장 흐름 보기",
    href: "/assets/stock/market",
  },
];

export function PortfolioNavSection() {
  return (
    <>
      <ScreenSection>
        <SectionHeader title="주식" />
        <GroupedList>
          {workflowItems.map((item) => (
            <EntryRow key={item.href} {...item} />
          ))}
        </GroupedList>
      </ScreenSection>

      <ScreenSection>
        <SectionHeader title="관리와 참고" />
        <GroupedList>
          {adminItems.map((item) => (
            <EntryRow key={item.href} {...item} />
          ))}
        </GroupedList>
      </ScreenSection>
    </>
  );
}
