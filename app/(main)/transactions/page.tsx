import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
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
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-500 py-12">
            가구 정보를 찾을 수 없습니다.
          </p>
        </div>
      </div>
    );
  }

  // 가구 구성원 목록 조회
  const household = await getHouseholdWithMembers(supabase, user.id);
  const members =
    household?.members.map((m) => ({ id: m.userId, name: m.name })) ?? [];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">거래 내역</h1>
            </div>
          </div>
          <Button asChild>
            <Link href="/transactions/new">
              <Plus className="size-4 mr-2" />
              거래 등록
            </Link>
          </Button>
        </div>

        {/* 거래 내역 목록 */}
        <TransactionList members={members} currentUserId={user.id} />
      </div>
    </div>
  );
}
