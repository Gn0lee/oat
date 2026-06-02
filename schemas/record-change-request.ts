import { z } from "zod";

export const recordChangeRequestTargetTypeSchema = z.enum([
  "ledger_entry",
  "stock_transaction",
]);

export type RecordChangeRequestTargetType = z.infer<
  typeof recordChangeRequestTargetTypeSchema
>;

export const recordChangeRequestTypeSchema = z.enum(["update", "delete"]);

export type RecordChangeRequestType = z.infer<
  typeof recordChangeRequestTypeSchema
>;

export const recordChangeRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export type RecordChangeRequestStatus = z.infer<
  typeof recordChangeRequestStatusSchema
>;

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const ledgerRecordUpdateProposedChangesSchema = z
  .object({
    amount: z.number().positive("금액은 0보다 커야 합니다.").optional(),
    title: z
      .string()
      .max(100, "내용은 100자 이내여야 합니다.")
      .nullable()
      .optional(),
    categoryId: z.uuid().nullable().optional(),
    fromAccountId: z.uuid().nullable().optional(),
    fromPaymentMethodId: z.uuid().nullable().optional(),
    toAccountId: z.uuid().nullable().optional(),
    toPaymentMethodId: z.uuid().nullable().optional(),
    transactedAt: z
      .string()
      .datetime("올바른 날짜 형식이 아닙니다.")
      .optional(),
    memo: z
      .string()
      .max(500, "메모는 500자 이내여야 합니다.")
      .nullable()
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "변경할 항목을 하나 이상 입력해주세요.",
  });

export type LedgerRecordUpdateProposedChanges = z.infer<
  typeof ledgerRecordUpdateProposedChangesSchema
>;

export const createRecordChangeRequestSchema = z.object({
  targetType: recordChangeRequestTargetTypeSchema,
  targetId: z.uuid("유효한 대상 ID가 아닙니다."),
  requestType: recordChangeRequestTypeSchema,
  message: z.string().max(1000, "메시지는 1000자 이내여야 합니다.").optional(),
  proposedChanges: jsonObjectSchema.default({}),
});

export type CreateRecordChangeRequestInput = z.infer<
  typeof createRecordChangeRequestSchema
>;

export const listRecordChangeRequestsSchema = z.object({
  box: z.enum(["received", "sent"]).optional(),
  status: recordChangeRequestStatusSchema.optional(),
});

export type ListRecordChangeRequestsInput = z.infer<
  typeof listRecordChangeRequestsSchema
>;

export const resolveRecordChangeRequestSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  responseMessage: z
    .string()
    .max(1000, "응답 메시지는 1000자 이내여야 합니다.")
    .optional(),
});

export type ResolveRecordChangeRequestInput = z.infer<
  typeof resolveRecordChangeRequestSchema
>;
