import { HouseholdMembersCard } from "@/components/household/HouseholdMembersCard";
import { HouseholdSettings } from "@/components/household/HouseholdSettings";
import { PageContainer } from "@/components/layout";
import { NotificationReadCacheInvalidator } from "@/components/notifications/NotificationReadCacheInvalidator";
import { getHouseholdWithMembers } from "@/lib/api/household";
import { markNotificationsAsReadForLinkBestEffort } from "@/lib/api/notifications";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function HouseholdPage() {
  const user = await requireUser();
  const supabase = await createClient();
  await markNotificationsAsReadForLinkBestEffort(supabase, user.id, {
    kind: "household_settings",
  });

  const household = await getHouseholdWithMembers(supabase, user.id);

  const isOwner =
    household?.members.find((m) => m.userId === user.id)?.role === "owner";

  return (
    <PageContainer maxWidth="medium">
      <NotificationReadCacheInvalidator />
      {household ? (
        <>
          <HouseholdSettings
            householdId={household.id}
            householdName={household.name}
            isOwner={isOwner}
          />

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
