import { BarChart3, PlusCircle } from "lucide-react";
import {
  DashboardSummarySection,
  QuickActionCard,
} from "@/components/dashboard";
import { ExchangeRateInfo } from "@/components/dashboard/ExchangeRateInfo";
import { PageHeader } from "@/components/layout";
import { getExchangeRateSafe } from "@/lib/api/exchange";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const user = await getUser();
  const supabase = await createClient();
  const exchangeRate = await getExchangeRateSafe(supabase, "USD", "KRW");

  return (
    <>
      <PageHeader title="대시보드" subtitle={`안녕하세요, ${user?.email}님`} />

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

      {/* 환율 정보 */}
      <ExchangeRateInfo
        rate={exchangeRate?.rate ?? null}
        updatedAt={exchangeRate?.updatedAt ?? null}
      />
    </>
  );
}
