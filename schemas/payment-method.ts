import { z } from "zod";

const paymentMethodTypeValues = [
  "credit_card",
  "debit_card",
  "prepaid",
  "gift_card",
  "cash",
] as const;

export const createPaymentMethodSchema = z.object({
  name: z
    .string()
    .min(1, "결제수단명은 필수입니다.")
    .max(50, "결제수단명은 50자 이내여야 합니다."),
  type: z.enum(paymentMethodTypeValues, {
    message: "결제수단 유형을 선택해주세요.",
  }),
  linkedAccountId: z.string().uuid().optional(),
  issuer: z
    .string()
    .max(50, "카드사/서비스명은 50자 이내여야 합니다.")
    .optional(),
  lastFour: z
    .string()
    .length(4, "카드 번호 끝 4자리를 입력해주세요.")
    .regex(/^\d{4}$/, "숫자 4자리만 입력해주세요.")
    .optional(),
  paymentDay: z
    .number()
    .int()
    .min(1, "결제일은 1일 이상이어야 합니다.")
    .max(31, "결제일은 31일 이하여야 합니다.")
    .optional(),
  isDefault: z.boolean().optional().default(false),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
});

export type CreatePaymentMethodInput = z.infer<
  typeof createPaymentMethodSchema
>;

export const updatePaymentMethodSchema = z.object({
  name: z
    .string()
    .min(1, "결제수단명은 필수입니다.")
    .max(50, "결제수단명은 50자 이내여야 합니다.")
    .optional(),
  type: z
    .enum(paymentMethodTypeValues, {
      message: "유효한 결제수단 유형이 아닙니다.",
    })
    .optional(),
  linkedAccountId: z.string().uuid().nullable().optional(),
  issuer: z
    .string()
    .max(50, "카드사/서비스명은 50자 이내여야 합니다.")
    .nullable()
    .optional(),
  lastFour: z
    .string()
    .length(4, "카드 번호 끝 4자리를 입력해주세요.")
    .regex(/^\d{4}$/, "숫자 4자리만 입력해주세요.")
    .nullable()
    .optional(),
  paymentDay: z
    .number()
    .int()
    .min(1, "결제일은 1일 이상이어야 합니다.")
    .max(31, "결제일은 31일 이하여야 합니다.")
    .nullable()
    .optional(),
  isDefault: z.boolean().optional(),
  memo: z
    .string()
    .max(500, "메모는 500자 이내여야 합니다.")
    .nullable()
    .optional(),
});

export type UpdatePaymentMethodInput = z.infer<
  typeof updatePaymentMethodSchema
>;
