import { Plus } from "lucide-react";
import Link from "next/link";
import { HoldingsList } from "@/components/holdings/HoldingsList";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { getAccounts } from "@/lib/api/account";
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

  // 계좌 목록 조회
  const accountsData = await getAccounts(supabase, householdId);
  const accounts = accountsData.map((a) => ({ id: a.id, name: a.name }));

  return (
    <>
      <PageHeader
        title="보유 현황"
        backHref="/assets/stock"
        action={
          <Button asChild size="sm">
            <Link href="/assets/stock/transactions/new">
              <Plus className="w-4 h-4 mr-1" />
              거래 추가
            </Link>
          </Button>
        }
      />

      {/* 보유 현황 목록 */}
      <HoldingsList members={members} accounts={accounts} />
    </>
  );
}
