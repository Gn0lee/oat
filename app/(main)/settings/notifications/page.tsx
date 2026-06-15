import { PageContainer } from "@/components/layout";
import { NotificationSettingsClient } from "@/components/notifications";
import { requireUser } from "@/lib/supabase/auth";

export default async function NotificationSettingsPage() {
  await requireUser();

  return (
    <PageContainer maxWidth="medium">
      <NotificationSettingsClient />
    </PageContainer>
  );
}
