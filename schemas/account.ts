import { z } from "zod";

/**
 * 계좌 유형 enum 값
 */
const accountTypeValues = [
  "stock",
  "savings",
  "deposit",
  "checking",
  "isa",
  "pension",
  "cma",
  "other",
] as const;

/**
 * 계좌 생성 요청 스키마
 */
export const createAccountSchema = z.object({
  name: z
    .string()
    .min(1, "계좌명은 필수입니다.")
    .max(50, "계좌명은 50자 이내여야 합니다."),
  broker: z
    .string()
    .max(50, "증권사/은행명은 50자 이내여야 합니다.")
    .optional(),
  accountNumber: z
    .string()
    .max(50, "계좌번호는 50자 이내여야 합니다.")
    .optional(),
  accountType: z.enum(accountTypeValues, {
    message: "계좌 유형을 선택해주세요.",
  }),
  isDefault: z.boolean().optional().default(false),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

/**
 * 계좌 수정 요청 스키마
 */
export const updateAccountSchema = z.object({
  name: z
    .string()
    .min(1, "계좌명은 필수입니다.")
    .max(50, "계좌명은 50자 이내여야 합니다.")
    .optional(),
  broker: z
    .string()
    .max(50, "증권사/은행명은 50자 이내여야 합니다.")
    .nullable()
    .optional(),
  accountNumber: z
    .string()
    .max(50, "계좌번호는 50자 이내여야 합니다.")
    .nullable()
    .optional(),
  accountType: z
    .enum(accountTypeValues, {
      message: "유효한 계좌 유형이 아닙니다.",
    })
    .optional(),
  isDefault: z.boolean().optional(),
  memo: z
    .string()
    .max(500, "메모는 500자 이내여야 합니다.")
    .nullable()
    .optional(),
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
