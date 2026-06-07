import { z } from "zod";

export const notificationTypeSchema = z.enum([
  "ledger_record_change_request",
  "stock_transaction_change_request",
  "ledger_request_result",
  "stock_transaction_request_result",
  "ledger_record_changed",
  "stock_transaction_changed",
  "ledger_record_created",
  "stock_transaction_created",
  "invitation_accepted",
]);

export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationTypes = notificationTypeSchema.options;

export const notificationSourceTypeSchema = z.enum([
  "ledger_entry",
  "stock_transaction",
  "record_change_request",
  "invitation",
]);

export type NotificationSourceType = z.infer<
  typeof notificationSourceTypeSchema
>;

export const notificationLinkSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ledger_record_date"),
    params: z.object({ date: z.iso.date() }),
  }),
  z.object({
    kind: z.literal("stock_record_date"),
    params: z.object({ date: z.iso.date() }),
  }),
  z.object({
    kind: z.literal("record_change_request_detail"),
    params: z.object({ requestId: z.uuid() }),
  }),
  z.object({
    kind: z.literal("household_settings"),
    params: z.object({}).optional(),
  }),
  z.object({
    kind: z.literal("notification_settings"),
    params: z.object({}).optional(),
  }),
]);

export type NotificationLink = z.infer<typeof notificationLinkSchema>;
export type NotificationLinkKind = NotificationLink["kind"];

export const notificationLinkKindSchema = z.enum([
  "ledger_record_date",
  "stock_record_date",
  "record_change_request_detail",
  "household_settings",
  "notification_settings",
]);

export const notificationPreferenceUpdateSchema = z.object({
  inAppEnabled: z.boolean(),
  pushEnabled: z.boolean(),
});

export type NotificationPreferenceUpdate = z.infer<
  typeof notificationPreferenceUpdateSchema
>;

export const notificationPreferenceBatchUpdateSchema = z
  .object({
    updates: z
      .array(
        notificationPreferenceUpdateSchema.extend({
          type: notificationTypeSchema,
        }),
      )
      .min(1, "변경할 알림 설정을 하나 이상 입력해주세요."),
  })
  .superRefine((value, context) => {
    const seen = new Set<NotificationType>();
    for (const [index, update] of value.updates.entries()) {
      if (seen.has(update.type)) {
        context.addIssue({
          code: "custom",
          message: "같은 알림 종류를 중복해서 설정할 수 없습니다.",
          path: ["updates", index, "type"],
        });
      }
      seen.add(update.type);
    }
  });

export type NotificationPreferenceBatchUpdate = z.infer<
  typeof notificationPreferenceBatchUpdateSchema
>;

export function normalizeNotificationLink(link?: NotificationLink | null): {
  linkKind: NotificationLinkKind | null;
  linkParams: Record<string, unknown>;
} {
  if (!link) {
    return { linkKind: null, linkParams: {} };
  }

  const parsed = notificationLinkSchema.parse(link);
  return {
    linkKind: parsed.kind,
    linkParams: parsed.params ?? {},
  };
}
