import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import { sendPushForNotification } from "@/lib/api/push-notifications";
import {
  getDefaultNotificationPreference,
  NOTIFICATION_TYPE_CONFIG,
  type NotificationPreferenceView,
} from "@/lib/notifications/defaults";
import {
  type NotificationLink,
  type NotificationType,
  normalizeNotificationLink,
  notificationSourceTypeSchema,
  notificationTypeSchema,
} from "@/lib/notifications/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Database,
  Json,
  Notification,
  NotificationPreference,
} from "@/types";

export interface NotificationItem {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  householdId: string | null;
  linkKind: Notification["link_kind"];
  linkParams: Json;
  sourceType: string | null;
  sourceId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResult {
  items: NotificationItem[];
  nextCursor: string | null;
}

export interface CreateUserNotificationInput {
  recipientId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  householdId?: string | null;
  link?: NotificationLink | null;
  source?: {
    type: string;
    id: string;
  } | null;
  dedupeKey?: string | null;
}

interface NotificationCursor {
  createdAt: string;
  id: string;
}

const DEFAULT_NOTIFICATION_LIMIT = 20;
const MAX_NOTIFICATION_LIMIT = 50;

function encodeCursor(cursor: NotificationCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeNotificationCursor(
  cursor: string | null,
): NotificationCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as Partial<NotificationCursor>;
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string") {
      return null;
    }
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

export function normalizeNotificationLimit(limitParam: string | null): number {
  const parsed = limitParam ? Number(limitParam) : DEFAULT_NOTIFICATION_LIMIT;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_NOTIFICATION_LIMIT;
  }
  return Math.min(Math.floor(parsed), MAX_NOTIFICATION_LIMIT);
}

function mapNotification(row: Notification): NotificationItem {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    type: row.type,
    title: row.title,
    body: row.body,
    householdId: row.household_id,
    linkKind: row.link_kind,
    linkParams: row.link_params,
    sourceType: row.source_type,
    sourceId: row.source_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function getNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: {
    limit: number;
    cursor: NotificationCursor | null;
  },
): Promise<NotificationListResult> {
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(options.limit + 1);

  if (options.cursor) {
    query = query.or(
      `created_at.lt.${options.cursor.createdAt},and(created_at.eq.${options.cursor.createdAt},id.lt.${options.cursor.id})`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const pageRows = rows.slice(0, options.limit);
  const nextRow = rows.length > options.limit ? pageRows.at(-1) : null;

  return {
    items: pageRows.map(mapNotification),
    nextCursor: nextRow
      ? encodeCursor({ createdAt: nextRow.created_at, id: nextRow.id })
      : null,
  };
}

export async function getUnreadNotificationCount(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function markNotificationAsRead(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
): Promise<NotificationItem> {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapNotification(data);
}

export async function markAllNotificationsAsRead(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .is("read_at", null)
    .select("id");

  if (error) {
    throw error;
  }

  return data?.length ?? 0;
}

export async function getNotificationPreferences(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<NotificationPreferenceView[]> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const overrides = new Map<NotificationType, NotificationPreference>();
  for (const row of data ?? []) {
    overrides.set(row.type, row);
  }

  return notificationTypeSchema.options.map((type) => {
    const config = NOTIFICATION_TYPE_CONFIG[type];
    const override = overrides.get(type);
    return {
      type,
      label: config.label,
      description: config.description,
      group: config.group,
      inAppEnabled: override?.in_app_enabled ?? config.defaults.inAppEnabled,
      pushEnabled: override?.push_enabled ?? config.defaults.pushEnabled,
      defaults: config.defaults,
    };
  });
}

export async function upsertNotificationPreference(
  supabase: SupabaseClient<Database>,
  userId: string,
  type: NotificationType,
  input: {
    inAppEnabled: boolean;
    pushEnabled: boolean;
  },
): Promise<NotificationPreferenceView> {
  const nextInput = {
    inAppEnabled: input.inAppEnabled,
    pushEnabled: input.inAppEnabled ? input.pushEnabled : false,
  };

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: userId,
      type,
      in_app_enabled: nextInput.inAppEnabled,
      push_enabled: nextInput.pushEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,type" },
  );

  if (error) {
    throw error;
  }

  const config = NOTIFICATION_TYPE_CONFIG[type];
  return {
    type,
    label: config.label,
    description: config.description,
    group: config.group,
    inAppEnabled: nextInput.inAppEnabled,
    pushEnabled: nextInput.pushEnabled,
    defaults: config.defaults,
  };
}

export async function upsertNotificationPreferences(
  supabase: SupabaseClient<Database>,
  userId: string,
  updates: Array<{
    type: NotificationType;
    inAppEnabled: boolean;
    pushEnabled: boolean;
  }>,
): Promise<NotificationPreferenceView[]> {
  const now = new Date().toISOString();
  const rows = updates.map((update) => ({
    user_id: userId,
    type: update.type,
    in_app_enabled: update.inAppEnabled,
    push_enabled: update.inAppEnabled ? update.pushEnabled : false,
    updated_at: now,
  }));

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(rows, { onConflict: "user_id,type" });

  if (error) {
    throw error;
  }

  return getNotificationPreferences(supabase, userId);
}

export async function createUserNotification(
  input: CreateUserNotificationInput,
): Promise<NotificationItem | null> {
  const type = notificationTypeSchema.parse(input.type);
  const admin = createAdminClient();
  const defaults = getDefaultNotificationPreference(type);

  const { data: preference, error: preferenceError } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", input.recipientId)
    .eq("type", type)
    .maybeSingle();

  if (preferenceError) {
    throw preferenceError;
  }

  const inAppEnabled = preference?.in_app_enabled ?? defaults.inAppEnabled;
  if (!inAppEnabled) {
    return null;
  }
  const pushEnabled = preference?.push_enabled ?? defaults.pushEnabled;

  const link = normalizeNotificationLink(input.link);
  const source = input.source
    ? {
        type: notificationSourceTypeSchema.parse(input.source.type),
        id: input.source.id,
      }
    : null;

  const { data, error } = await admin
    .from("notifications")
    .insert({
      recipient_id: input.recipientId,
      household_id: input.householdId ?? null,
      type,
      title: input.title,
      body: input.body ?? null,
      link_kind: link.linkKind,
      link_params: link.linkParams as Json,
      source_type: source?.type ?? null,
      source_id: source?.id ?? null,
      dedupe_key: input.dedupeKey ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505" && input.dedupeKey) {
      return null;
    }
    throw error;
  }

  const notification = mapNotification(data);

  if (pushEnabled) {
    try {
      await sendPushForNotification(notification);
    } catch (error) {
      console.error("Push notification fan-out error:", error);
    }
  }

  return notification;
}

export function assertKnownNotificationType(type: string): NotificationType {
  const parsed = notificationTypeSchema.safeParse(type);
  if (!parsed.success) {
    throw new APIError(
      "NOTIFICATION_TYPE_INVALID",
      "알 수 없는 알림 종류입니다.",
      400,
    );
  }
  return parsed.data;
}
