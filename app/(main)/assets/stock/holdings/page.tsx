import { Plus } from "lucide-react";
import Link from "next/link";
import { StockTabNav } from "@/components/assets/stock";
import { HoldingsList } from "@/components/holdings/HoldingsList";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { getHoldings } from "@/lib/api/holdings";
import { getHouseholdWithMembers } from "@/lib/api/household";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function HoldingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // 가구 정보 조회
  const householdId = await getUserHouseholdId(supabase, user.id);

  if (!householdId) {
    return (
      <p className="text-center text-gray-500 py-12">
        가구 정보를 찾을 수 없습니다.
      </p>
    );
  }

  // 가구 구성원 목록 조회
  const household = await getHouseholdWithMembers(supabase, user.id);
  const members =
    household?.members.map((m) => ({ id: m.userId, name: m.name })) ?? [];

  // 초기 보유 현황 조회
  const initialData = await getHoldings(supabase, householdId, {
    pagination: { page: 1, pageSize: 20 },
  });

  return (
    <>
      <PageHeader
        title="주식"
        backHref="/assets"
        action={
          <Button asChild size="sm">
            <Link href="/assets/stock/transactions/new">
              <Plus className="w-4 h-4 mr-1" />
              거래 추가
            </Link>
          </Button>
        }
      />

      {/* 탭 네비게이션 */}
      <StockTabNav activeTab="holdings" />

      {/* 보유 현황 요약 */}
      <p className="text-sm text-gray-500">
        총 {initialData.total}개 종목 보유 중
      </p>

      {/* 보유 현황 목록 */}
      <HoldingsList initialData={initialData} members={members} />
    </>
  );
}
