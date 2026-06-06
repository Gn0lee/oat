import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types";
import { createUserNotification } from "./notifications";

interface InvitationAcceptedNotificationInput {
  invitationId: string;
  householdId: string;
  acceptedUserId: string;
  invitedEmail: string;
}

async function getHouseholdNotificationRecipients(
  supabase: SupabaseClient<Database>,
  householdId: string,
  acceptedUserId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId)
    .neq("user_id", acceptedUserId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((member) => member.user_id);
}

async function getAcceptedUserDisplayName(
  supabase: SupabaseClient<Database>,
  acceptedUserId: string,
  invitedEmail: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", acceptedUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.name?.trim() || invitedEmail;
}

export async function notifyInvitationAccepted(
  supabase: SupabaseClient<Database>,
  input: InvitationAcceptedNotificationInput,
): Promise<void> {
  try {
    const [recipients, acceptedUserName] = await Promise.all([
      getHouseholdNotificationRecipients(
        supabase,
        input.householdId,
        input.acceptedUserId,
      ),
      getAcceptedUserDisplayName(
        supabase,
        input.acceptedUserId,
        input.invitedEmail,
      ),
    ]);

    await Promise.all(
      recipients.map((recipientId) =>
        createUserNotification({
          recipientId,
          householdId: input.householdId,
          type: "invitation_accepted",
          title: "새 구성원이 합류했습니다",
          body: `${acceptedUserName}님이 가구에 합류했습니다.`,
          link: { kind: "household_settings" },
          source: { type: "invitation", id: input.invitationId },
          dedupeKey: `invitation_accepted:${input.invitationId}`,
        }),
      ),
    );
  } catch (error) {
    console.error("Invitation accepted notification creation error:", error);
  }
}
