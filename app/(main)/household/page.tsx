import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AcceptInvitation } from "@/components/household/AcceptInvitation";
import { InvitationCode } from "@/components/household/InvitationCode";
import { MemberList } from "@/components/household/MemberList";
import { Button } from "@/components/ui/button";
import { getHouseholdWithMembers } from "@/lib/api/household";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function HouseholdPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const household = await getHouseholdWithMembers(supabase, user.id);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">가구 관리</h1>
            {household && (
              <p className="text-sm text-gray-500">{household.name}</p>
            )}
          </div>
        </div>

        {household ? (
          household.members.length === 1 ? (
            <>
              {/* 단독 가구: 초대 수락을 먼저 보여줌 */}
              <AcceptInvitation />
              <InvitationCode />
            </>
          ) : (
            <>
              {/* 다중 가구: 구성원 목록 + 초대 코드 생성 */}
              <MemberList members={household.members} currentUserId={user.id} />
              <InvitationCode />
            </>
          )
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">가구 정보를 찾을 수 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
