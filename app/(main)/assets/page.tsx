import { AssetTypeCard } from "@/components/assets";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getPortfolioSummary } from "@/lib/api/portfolio";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/format";

export default async function AssetsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // 가구 ID 조회
  const householdId = await getUserHouseholdId(supabase, user.id);

  // 포트폴리오 요약 조회
  const portfolio = householdId
    ? await getPortfolioSummary(supabase, householdId)
    : { holdingCount: 0, totalValue: 0, totalInvested: 0, returnRate: 0 };

  return (
    <>
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">내 자산</h1>
      </div>

      {/* 총 자산 요약 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <span className="text-sm text-gray-500">총 자산</span>
        <p className="text-3xl font-bold text-gray-900 mt-1">
          {formatCurrency(portfolio.totalValue)}
        </p>
      </div>

      {/* 자산 유형별 카드 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">자산 유형</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 주식/ETF - 활성 */}
          <AssetTypeCard
            type="stock"
            holdingCount={portfolio.holdingCount}
            totalValue={portfolio.totalValue}
            returnRate={portfolio.returnRate}
          />

          {/* 현금/예적금 - 준비 중 */}
          <AssetTypeCard type="cash" disabled />

          {/* 부동산 - 준비 중 */}
          <AssetTypeCard type="real-estate" disabled />

          {/* 기타 - 준비 중 */}
          <AssetTypeCard type="other" disabled />
        </div>
      </div>
    </>
  );
}
