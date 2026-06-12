import { z } from "zod";

const ledgerEntryTypeValues = [
  "expense",
  "income",
  "transfer",
  "non_expense_withdrawal",
] as const;

const createLedgerEntryBaseSchema = z.object({
  type: z.enum(ledgerEntryTypeValues, {
    message: "유효한 항목 유형이 아닙니다.",
  }),
  amount: z.number().positive("금액은 0보다 커야 합니다."),
  transactedAt: z.string().datetime("올바른 날짜 형식이 아닙니다."),
  title: z
    .string()
    .min(1, "내용을 입력해주세요.")
    .max(100, "내용은 100자 이내여야 합니다."),
  categoryId: z.string().uuid().optional(),
  fromAccountId: z.string().uuid().optional(),
  fromPaymentMethodId: z.string().uuid().optional(),
  toAccountId: z.string().uuid().optional(),
  toPaymentMethodId: z.string().uuid().optional(),
  isShared: z.boolean().default(true),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
});

export const createLedgerEntrySchema = createLedgerEntryBaseSchema.superRefine(
  (value, ctx) => {
    if (value.type === "transfer") {
      const sourceCount =
        Number(Boolean(value.fromAccountId)) +
        Number(Boolean(value.fromPaymentMethodId));
      const destinationCount =
        Number(Boolean(value.toAccountId)) +
        Number(Boolean(value.toPaymentMethodId));

      if (sourceCount !== 1) {
        ctx.addIssue({
          code: "custom",
          path: ["fromAccountId"],
          message: "이체 출발지를 하나 선택해주세요.",
        });
      }

      if (destinationCount !== 1) {
        ctx.addIssue({
          code: "custom",
          path: ["toAccountId"],
          message: "이체 도착지를 하나 선택해주세요.",
        });
      }

      if (value.categoryId) {
        ctx.addIssue({
          code: "custom",
          path: ["categoryId"],
          message: "이체에는 카테고리를 선택할 수 없습니다.",
        });
      }
    } else if (value.type === "non_expense_withdrawal") {
      const sourceCount =
        Number(Boolean(value.fromAccountId)) +
        Number(Boolean(value.fromPaymentMethodId));

      if (sourceCount !== 1) {
        ctx.addIssue({
          code: "custom",
          path: ["fromAccountId"],
          message: "출금처를 하나 선택해주세요.",
        });
      }

      if (value.toAccountId || value.toPaymentMethodId) {
        ctx.addIssue({
          code: "custom",
          path: ["toAccountId"],
          message: "비지출 출금에는 입금처를 설정할 수 없습니다.",
        });
      }

      if (value.categoryId) {
        ctx.addIssue({
          code: "custom",
          path: ["categoryId"],
          message: "비지출 출금에는 카테고리를 설정할 수 없습니다.",
        });
      }
    }
  },
);

export type CreateLedgerEntryInput = z.infer<typeof createLedgerEntrySchema>;

export const updateLedgerEntrySchema = z.object({
  type: z
    .enum(ledgerEntryTypeValues, {
      message: "유효한 항목 유형이 아닙니다.",
    })
    .optional(),
  amount: z.number().positive("금액은 0보다 커야 합니다.").optional(),
  transactedAt: z.string().datetime("올바른 날짜 형식이 아닙니다.").optional(),
  title: z
    .string()
    .max(100, "내용은 100자 이내여야 합니다.")
    .nullable()
    .optional(),
  categoryId: z.string().uuid().nullable().optional(),
  fromAccountId: z.string().uuid().nullable().optional(),
  fromPaymentMethodId: z.string().uuid().nullable().optional(),
  toAccountId: z.string().uuid().nullable().optional(),
  toPaymentMethodId: z.string().uuid().nullable().optional(),
  isShared: z.never({ message: "공개범위는 수정할 수 없습니다." }).optional(),
  memo: z
    .string()
    .max(500, "메모는 500자 이내여야 합니다.")
    .nullable()
    .optional(),
});

export type UpdateLedgerEntryInput = z.infer<typeof updateLedgerEntrySchema>;
