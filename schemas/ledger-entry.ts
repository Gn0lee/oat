import { z } from "zod";

const ledgerEntryTypeValues = ["expense", "income", "transfer"] as const;

export const createLedgerEntrySchema = z.object({
  type: z.enum(ledgerEntryTypeValues, {
    message: "유효한 항목 유형이 아닙니다.",
  }),
  amount: z.number().positive("금액은 0보다 커야 합니다."),
  transactedAt: z.string().datetime("올바른 날짜 형식이 아닙니다."),
  categoryId: z.string().uuid().optional(),
  fromAccountId: z.string().uuid().optional(),
  fromPaymentMethodId: z.string().uuid().optional(),
  toAccountId: z.string().uuid().optional(),
  toPaymentMethodId: z.string().uuid().optional(),
  isShared: z.boolean().default(true),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
});

export type CreateLedgerEntryInput = z.infer<typeof createLedgerEntrySchema>;

export const updateLedgerEntrySchema = z.object({
  type: z
    .enum(ledgerEntryTypeValues, {
      message: "유효한 항목 유형이 아닙니다.",
    })
    .optional(),
  amount: z.number().positive("금액은 0보다 커야 합니다.").optional(),
  transactedAt: z.string().datetime("올바른 날짜 형식이 아닙니다.").optional(),
  categoryId: z.string().uuid().nullable().optional(),
  fromAccountId: z.string().uuid().nullable().optional(),
  fromPaymentMethodId: z.string().uuid().nullable().optional(),
  toAccountId: z.string().uuid().nullable().optional(),
  toPaymentMethodId: z.string().uuid().nullable().optional(),
  isShared: z.boolean().optional(),
  memo: z
    .string()
    .max(500, "메모는 500자 이내여야 합니다.")
    .nullable()
    .optional(),
});

export type UpdateLedgerEntryInput = z.infer<typeof updateLedgerEntrySchema>;
