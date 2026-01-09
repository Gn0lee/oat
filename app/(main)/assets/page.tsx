import { Plus } from "lucide-react";
import Link from "next/link";
import { AssetTypeCard } from "@/components/assets";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
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
      <PageHeader
        title="내 자산"
        action={
          <Link href="/assets/stock/transactions/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              자산 기록
            </Button>
          </Link>
        }
      />

      {/* 총 자산 요약 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <span className="text-sm text-gray-500">총 자산</span>
        <p className="text-3xl font-bold text-gray-900 mt-1">
          {formatCurrency(portfolio.totalValue)}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          우리 가족의 모든 자산을 한눈에 관리하세요
        </p>
      </div>

      {/* 자산 유형별 리스트 */}
      <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
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
    </>
  );
}
