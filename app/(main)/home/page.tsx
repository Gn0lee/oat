import {
  AssetTypeSummary,
  ExchangeRateCard,
  RecentTransactions,
  TopHoldings,
  TotalAssetCard,
} from "@/components/home";
import type { ExchangeRateData } from "@/components/home/ExchangeRateCard";
import { getAllExchangeRates } from "@/lib/api/exchange";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getPortfolioSummary } from "@/lib/api/portfolio";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const user = await requireUser();
  const supabase = await createClient();

  // 가구 ID 조회
  const householdId = await getUserHouseholdId(supabase, user.id);

  // 포트폴리오 요약 조회
  const portfolio = householdId
    ? await getPortfolioSummary(supabase, householdId)
    : { holdingCount: 0, totalValue: 0, totalInvested: 0, returnRate: 0 };

  // 환율 조회
  const exchangeRatesData = await getAllExchangeRates(supabase);
  const exchangeRates: ExchangeRateData[] = exchangeRatesData.map((r) => ({
    from: r.fromCurrency,
    to: r.toCurrency,
    rate: r.rate,
    updatedAt: r.updatedAt,
  }));

  // 사용자 이름 조회
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  const userName = profile?.name ?? user.email?.split("@")[0] ?? "사용자";

  return (
    <>
      {/* 인사말 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          안녕하세요, {userName}님
        </h1>
      </div>

      {/* 총 자산 카드 & 환율 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TotalAssetCard totalInvested={portfolio.totalInvested} />
        <ExchangeRateCard rates={exchangeRates} />
      </div>

      {/* 자산 유형별 요약 */}
      <AssetTypeSummary />

      {/* 최근 거래 & TOP 5 종목 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RecentTransactions />
        <TopHoldings />
      </div>
    </>
  );
}
