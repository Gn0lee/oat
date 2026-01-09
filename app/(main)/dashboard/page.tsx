import { BarChart3, PlusCircle } from "lucide-react";
import {
  DashboardSummarySection,
  QuickActionCard,
} from "@/components/dashboard";
import { getUser } from "@/lib/supabase/auth";

export default async function DashboardPage() {
  const user = await getUser();

  return (
    <>
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500">안녕하세요, {user?.email}님</p>
      </div>

      {/* 총 자산 / 수익률 / 요약 카드 */}
      <DashboardSummarySection />

      {/* 빠른 액션 */}
      <div className="space-y-3">
        <QuickActionCard
          icon={PlusCircle}
          title="거래 등록"
          description="매수/매도 기록 추가"
          href="/assets/stock/transactions/new"
          actionLabel="등록하기"
        />
        <QuickActionCard
          icon={BarChart3}
          title="보유 현황"
          description="현재 보유 종목 확인"
          href="/assets/stock/holdings"
          actionLabel="확인하기"
        />
      </div>
    </>
  );
}
