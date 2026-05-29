import { z } from "zod";

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

const accountCategoryValues = ["bank", "investment"] as const;

export const createAccountSchema = z.object({
  name: z
    .string()
    .min(1, "계좌명은 필수입니다.")
    .max(50, "계좌명은 50자 이내여야 합니다."),
  broker: z
    .string()
    .max(50, "증권사/은행명은 50자 이내여야 합니다.")
    .optional(),
  lastFour: z
    .string()
    .length(4, "계좌번호 뒤 4자리를 입력해주세요.")
    .regex(/^\d{4}$/, "숫자 4자리만 입력해주세요.")
    .optional(),
  accountType: z.enum(accountTypeValues, {
    message: "계좌 유형을 선택해주세요.",
  }),
  category: z.enum(accountCategoryValues).optional(),
  balance: z.number().min(0, "잔액은 0 이상이어야 합니다.").optional(),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

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
  lastFour: z
    .string()
    .length(4, "계좌번호 뒤 4자리를 입력해주세요.")
    .regex(/^\d{4}$/, "숫자 4자리만 입력해주세요.")
    .nullable()
    .optional(),
  accountType: z
    .enum(accountTypeValues, {
      message: "유효한 계좌 유형이 아닙니다.",
    })
    .optional(),
  category: z.enum(accountCategoryValues).nullable().optional(),
  balance: z
    .number()
    .min(0, "잔액은 0 이상이어야 합니다.")
    .nullable()
    .optional(),
  memo: z
    .string()
    .max(500, "메모는 500자 이내여야 합니다.")
    .nullable()
    .optional(),
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
