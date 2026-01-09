import { Plus } from "lucide-react";
import Link from "next/link";
import { StockTabNav } from "@/components/assets/stock";
import { PageHeader } from "@/components/layout";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Button } from "@/components/ui/button";
import { getHouseholdWithMembers } from "@/lib/api/household";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function TransactionsPage() {
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
      <StockTabNav activeTab="transactions" />

      {/* 거래 내역 목록 */}
      <TransactionList members={members} currentUserId={user.id} />
    </>
  );
}
