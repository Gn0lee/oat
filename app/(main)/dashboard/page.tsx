import { BarChart3, PlusCircle } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { QuickActionCard, SummaryCard } from "@/components/dashboard";
import { ExchangeRateInfo } from "@/components/dashboard/ExchangeRateInfo";
import { getExchangeRateSafe } from "@/lib/api/exchange";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

// Mock 데이터 (추후 API 연동 시 제거)
const mockDashboardData = {
  byMember: [
    { label: "홍길동", value: 75000000, percentage: 60, color: "#4F46E5" },
    { label: "김영희", value: 50000000, percentage: 40, color: "#03B26C" },
  ],
  byAssetClass: [
    { label: "주식", value: 80000000, percentage: 64, color: "#4F46E5" },
    { label: "채권", value: 25000000, percentage: 20, color: "#03B26C" },
    { label: "현금", value: 20430000, percentage: 16, color: "#8B95A1" },
  ],
};

export default async function DashboardPage() {
  const user = await getUser();
  const supabase = await createClient();
  const exchangeRate = await getExchangeRateSafe(supabase, "USD", "KRW");

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
            <p className="text-sm text-gray-500">안녕하세요, {user?.email}님</p>
          </div>
          <LogoutButton />
        </div>

        {/* 요약 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SummaryCard
            title="구성원별 자산"
            items={mockDashboardData.byMember}
          />
          <SummaryCard
            title="자산군별 비중"
            items={mockDashboardData.byAssetClass}
          />
        </div>

        {/* 빠른 액션 */}
        <div className="space-y-3">
          <QuickActionCard
            icon={PlusCircle}
            title="거래 등록"
            description="매수/매도 기록 추가"
            href="/transactions/new"
            actionLabel="등록하기"
          />
          <QuickActionCard
            icon={BarChart3}
            title="보유 현황"
            description="현재 보유 종목 확인"
            href="/holdings"
            actionLabel="확인하기"
          />
        </div>

        {/* 환율 정보 */}
        <ExchangeRateInfo
          rate={exchangeRate?.rate ?? null}
          updatedAt={exchangeRate?.updatedAt ?? null}
        />
      </div>
    </div>
  );
}
