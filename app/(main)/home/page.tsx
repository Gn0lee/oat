import {
  QuickActions,
  RecentTransactions,
  TopHoldings,
  TotalAssetCard,
} from "@/components/home";
import { getHoldings } from "@/lib/api/holdings";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const user = await requireUser();
  const supabase = await createClient();

  // 가구 ID 조회
  const householdId = await getUserHouseholdId(supabase, user.id);

  // 총 투자금액 계산 (holdings 전체 조회)
  let totalInvested = 0;
  if (householdId) {
    const holdings = await getHoldings(supabase, householdId, {
      pagination: { page: 1, pageSize: 1000 },
    });
    totalInvested = holdings.data.reduce((sum, h) => sum + h.totalInvested, 0);
  }

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

      {/* 총 자산 카드 */}
      <TotalAssetCard totalInvested={totalInvested} />

      {/* 빠른 액션 */}
      <QuickActions />

      {/* 최근 거래 & TOP 5 종목 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RecentTransactions />
        <TopHoldings />
      </div>
    </>
  );
}
