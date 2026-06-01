import { PageContainer } from "@/components/layout";
import { NotificationInboxClient } from "@/components/notifications";
import { requireUser } from "@/lib/supabase/auth";

export default async function NotificationsPage() {
  await requireUser();

  return (
    <PageContainer maxWidth="narrow">
      <NotificationInboxClient />
    </PageContainer>
  );
}
