import { HouseholdMembersCard } from "@/components/household/HouseholdMembersCard";
import { HouseholdSettings } from "@/components/household/HouseholdSettings";
import { PageContainer, PageHeader } from "@/components/layout";
import { getHouseholdWithMembers } from "@/lib/api/household";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function HouseholdPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const household = await getHouseholdWithMembers(supabase, user.id);

  const isOwner =
    household?.members.find((m) => m.userId === user.id)?.role === "owner";

  return (
    <PageContainer maxWidth="medium">
      <PageHeader title="가구 관리" />

      {household ? (
        <>
          {/* 가구 설정 */}
          <HouseholdSettings
            householdId={household.id}
            householdName={household.name}
            isOwner={isOwner}
          />

          {/* 구성원 목록 및 초대 */}
          <HouseholdMembersCard
            members={household.members}
            currentUserId={user.id}
            isOwner={isOwner}
          />
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">가구 정보를 찾을 수 없습니다.</p>
        </div>
      )}
    </PageContainer>
  );
}
