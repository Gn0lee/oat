import { z } from "zod";

/**
 * 거래 등록 폼 스키마 (클라이언트용)
 * - react-hook-form과 연동
 * - 폼 입력값을 API 요청 형식으로 변환 필요
 */
export const transactionFormSchema = z.object({
  type: z.enum(["buy", "sell"], {
    message: "거래 유형을 선택해주세요.",
  }),
  quantity: z
    .string()
    .min(1, "수량을 입력해주세요.")
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
      message: "수량은 0보다 커야 합니다.",
    }),
  price: z
    .string()
    .min(1, "거래 단가를 입력해주세요.")
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) >= 0, {
      message: "거래 단가는 0 이상이어야 합니다.",
    }),
  transactedAt: z.string().min(1, "거래일을 선택해주세요."),
  accountId: z.string().optional(),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
});

export type TransactionFormData = z.infer<typeof transactionFormSchema>;
