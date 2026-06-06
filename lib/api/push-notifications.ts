import webPush from "web-push";
import { APIError } from "@/lib/api/error";
import type { NotificationItem } from "@/lib/api/notifications";
import { buildNotificationHref } from "@/lib/notifications/links";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PushSubscription } from "@/types";

interface PushEnvironment {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export interface PushSubscriptionStatus {
  isConfigured: boolean;
  isSubscribed: boolean;
  unavailableReason: "server_unavailable" | null;
}

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}

function getPushEnvironment(): PushEnvironment | null {
  const publicKey =
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY ??
    process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    if (process.env.NODE_ENV === "production") {
      console.error("Missing Web Push VAPID environment variables.");
    }
    return null;
  }

  return { publicKey, privateKey, subject };
}

export function getPublicVapidKey(): string | null {
  return (
    process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ??
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY ??
    null
  );
}

function configureWebPush(): boolean {
  const env = getPushEnvironment();
  if (!env) {
    return false;
  }

  webPush.setVapidDetails(env.subject, env.publicKey, env.privateKey);
  return true;
}

function toWebPushSubscription(subscription: PushSubscription) {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };
}

function isGoneWebPushError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    ((error as { statusCode?: number }).statusCode === 404 ||
      (error as { statusCode?: number }).statusCode === 410)
  );
}

export async function getCurrentPushSubscriptionStatus(
  userId: string,
  endpoint: string | null,
): Promise<PushSubscriptionStatus> {
  const isConfigured =
    Boolean(getPublicVapidKey()) && Boolean(getPushEnvironment());
  if (!isConfigured) {
    return {
      isConfigured: false,
      isSubscribed: false,
      unavailableReason: "server_unavailable",
    };
  }

  if (!endpoint) {
    return {
      isConfigured: true,
      isSubscribed: false,
      unavailableReason: null,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    isConfigured: true,
    isSubscribed: Boolean(data),
    unavailableReason: null,
  };
}

export async function savePushSubscription(
  userId: string,
  input: PushSubscriptionInput,
): Promise<PushSubscriptionStatus> {
  if (!getPushEnvironment()) {
    throw new APIError(
      "PUSH_SERVER_UNAVAILABLE",
      "현재 Push 알림을 사용할 수 없습니다.",
      503,
    );
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: existing, error: existingError } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("endpoint", input.endpoint)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing && existing.user_id !== userId) {
    throw new APIError(
      "PUSH_SUBSCRIPTION_CONFLICT",
      "이 기기의 Push 구독을 저장할 수 없습니다.",
      409,
    );
  }

  const row = {
    user_id: userId,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    user_agent: input.userAgent ?? null,
    last_seen_at: now,
    revoked_at: null,
    updated_at: now,
  };

  const { error } = existing
    ? await admin.from("push_subscriptions").update(row).eq("id", existing.id)
    : await admin.from("push_subscriptions").insert(row);

  if (error) {
    throw error;
  }

  return {
    isConfigured: true,
    isSubscribed: true,
    unavailableReason: null,
  };
}

export async function revokeCurrentPushSubscription(
  userId: string,
  endpoint: string,
): Promise<PushSubscriptionStatus> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("push_subscriptions")
    .update({ revoked_at: now, updated_at: now })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .is("revoked_at", null);

  if (error) {
    throw error;
  }

  return {
    isConfigured: Boolean(getPublicVapidKey()) && Boolean(getPushEnvironment()),
    isSubscribed: false,
    unavailableReason: null,
  };
}

export async function sendPushForNotification(
  notification: NotificationItem,
): Promise<void> {
  if (!configureWebPush()) {
    return;
  }

  const admin = createAdminClient();
  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", notification.recipientId)
    .is("revoked_at", null);

  if (error) {
    throw error;
  }

  if (!subscriptions || subscriptions.length === 0) {
    return;
  }

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    notificationId: notification.id,
    url: buildNotificationHref({
      linkKind: notification.linkKind,
      linkParams: notification.linkParams,
    }),
    icon: "/web-app-manifest-192x192.png",
    badge: "/favicon-96x96.png",
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          toWebPushSubscription(subscription),
          payload,
        );
      } catch (error) {
        if (isGoneWebPushError(error)) {
          await revokeExpiredPushSubscription(admin, subscription.id);
          return;
        }

        console.error("Push notification send error:", error);
      }
    }),
  );
}

async function revokeExpiredPushSubscription(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
) {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("push_subscriptions")
    .update({ revoked_at: now, updated_at: now })
    .eq("id", id);

  if (error) {
    console.error("Push subscription revoke error:", error);
  }
}
