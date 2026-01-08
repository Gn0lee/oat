import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { HouseholdSettings } from "@/components/household/HouseholdSettings";
import { InvitationForm } from "@/components/household/InvitationForm";
import { MemberList } from "@/components/household/MemberList";
import { Button } from "@/components/ui/button";
import { getHouseholdWithMembers } from "@/lib/api/household";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function HouseholdPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const household = await getHouseholdWithMembers(supabase, user.id);

  const isOwner =
    household?.members.find((m) => m.userId === user.id)?.role === "owner";
  const isSingleMember = household?.members.length === 1;

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
          <>
            {/* 가구 설정 */}
            <HouseholdSettings
              householdId={household.id}
              householdName={household.name}
              isOwner={isOwner}
            />

            {/* 구성원 목록 (2명 이상일 때만) */}
            {!isSingleMember && (
              <MemberList members={household.members} currentUserId={user.id} />
            )}

            {/* 파트너 초대 (owner이고 1명일 때만) */}
            {isOwner && isSingleMember && <InvitationForm />}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">가구 정보를 찾을 수 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
