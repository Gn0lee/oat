import { z } from "zod";

/**
 * 멀티 거래 폼 - 개별 종목 행 스키마
 * stock이 null이면 빈 행으로 취급하여 제출 시 제외
 */
export const transactionItemSchema = z.object({
  stock: z
    .object({
      code: z.string(),
      name: z.string(),
      market: z.enum(["KR", "US", "OTHER"]),
      exchange: z.string().nullable(),
    })
    .nullable(),
  quantity: z.string(),
  price: z.string(),
  memo: z.string().optional(),
});

export type TransactionItemFormData = z.infer<typeof transactionItemSchema>;

/**
 * 멀티 거래 폼 스키마 (클라이언트용)
 * - react-hook-form과 연동
 * - 빈 행 필터링은 제출 시 처리
 * - type은 전역으로 지정 (모든 아이템에 동일 적용)
 */
export const multiTransactionFormSchema = z.object({
  type: z.enum(["buy", "sell"]),
  transactedAt: z.string().min(1, "거래일을 선택해주세요."),
  accountId: z.string().optional(),
  items: z
    .array(transactionItemSchema)
    .min(1, "최소 1개 이상의 종목을 입력해주세요."),
});

export type MultiTransactionFormData = z.infer<
  typeof multiTransactionFormSchema
>;

/**
 * 빈 행 기본값
 */
export const DEFAULT_TRANSACTION_ITEM: TransactionItemFormData = {
  stock: null,
  quantity: "",
  price: "",
  memo: "",
};
