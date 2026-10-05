import { z } from "zod";

export const recordChangeRequestTargetTypeSchema = z.enum([
  "ledger_entry",
  "stock_transaction",
]);

export type RecordChangeRequestTargetType = z.infer<
  typeof recordChangeRequestTargetTypeSchema
>;

export const recordChangeRequestTypeSchema = z.enum([
  "update",
  "delete",
  "reclassify",
]);

export type RecordChangeRequestType = z.infer<
  typeof recordChangeRequestTypeSchema
>;

export const recordChangeRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "expired",
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

export const stockTransactionUpdateProposedChangesSchema = z
  .object({
    quantity: z
      .number()
      .positive("수량은 0보다 커야 합니다.")
      .max(999999999, "수량이 너무 큽니다.")
      .optional(),
    price: z
      .number()
      .min(0, "가격은 0 이상이어야 합니다.")
      .max(999999999999, "가격이 너무 큽니다.")
      .optional(),
    transactedAt: z
      .string()
      .datetime("올바른 날짜 형식이 아닙니다.")
      .optional(),
    accountId: z.uuid("유효한 계좌 ID가 아닙니다.").optional(),
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

export type StockTransactionUpdateProposedChanges = z.infer<
  typeof stockTransactionUpdateProposedChangesSchema
>;

// 장부 이동 요청은 목적 장부 하나만 담는다. 금액 등 수정 요청과 섞지 않는다.
export const ledgerReclassifyProposedChangesSchema = z
  .object({ bookId: z.uuid("유효한 장부 ID가 아닙니다.") })
  .strict();

export type LedgerReclassifyProposedChanges = z.infer<
  typeof ledgerReclassifyProposedChangesSchema
>;

export const createRecordChangeRequestSchema = z
  .object({
    targetType: recordChangeRequestTargetTypeSchema,
    targetId: z.uuid("유효한 대상 ID가 아닙니다."),
    requestType: recordChangeRequestTypeSchema,
    message: z
      .string()
      .max(1000, "메시지는 1000자 이내여야 합니다.")
      .optional(),
    proposedChanges: jsonObjectSchema.default({}),
    expectedEntryUpdatedAt: z
      .string()
      .datetime({ offset: true, message: "올바른 기록 버전이 아닙니다." })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.requestType !== "reclassify") return;
    if (value.targetType !== "ledger_entry") {
      ctx.addIssue({
        code: "custom",
        path: ["targetType"],
        message: "가계부 기록만 장부 이동을 요청할 수 있습니다.",
      });
    }
    if (!value.expectedEntryUpdatedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["expectedEntryUpdatedAt"],
        message: "기록 버전이 필요합니다.",
      });
    }
    const changes = ledgerReclassifyProposedChangesSchema.safeParse(
      value.proposedChanges,
    );
    if (!changes.success) {
      ctx.addIssue({
        code: "custom",
        path: ["proposedChanges"],
        message: "이동할 장부 하나만 선택해주세요.",
      });
    }
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
