import { PageContainer } from "@/components/layout";
import { NotificationSettingsClient } from "@/components/notifications";
import { NotificationReadCacheInvalidator } from "@/components/notifications/NotificationReadCacheInvalidator";
import { markNotificationsAsReadForLinkBestEffort } from "@/lib/api/notifications";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationSettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  await markNotificationsAsReadForLinkBestEffort(supabase, user.id, {
    kind: "notification_settings",
  });

  return (
    <PageContainer maxWidth="medium">
      <NotificationReadCacheInvalidator />
      <NotificationSettingsClient />
    </PageContainer>
  );
}
