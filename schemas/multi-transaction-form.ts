import { z } from "zod";
import { batchTransactionItemSchema } from "@/schemas/transaction";

const quantitySchema = z
  .string()
  .refine(
    (value) =>
      value.trim().length > 0 &&
      batchTransactionItemSchema.shape.quantity.safeParse(Number(value))
        .success,
    "유효한 수량을 입력해주세요.",
  );

const priceSchema = z
  .string()
  .refine(
    (value) =>
      value.trim().length > 0 &&
      batchTransactionItemSchema.shape.price.safeParse(Number(value)).success,
    "유효한 단가를 입력해주세요.",
  );

/**
 * 멀티 거래 폼 - 개별 종목 행 스키마
 * stock is nullable for the draft default; submitted rows must be complete.
 */
export const transactionItemSchema = z.object({
  stock: z
    .object({
      code: z.string().min(1, "종목 코드는 필수입니다."),
      name: z.string().min(1, "종목명은 필수입니다."),
      market: z.enum(["KR", "US", "OTHER"]),
      exchange: z.string().nullable(),
    })
    .nullable()
    .refine((stock) => stock !== null, "종목을 선택해주세요."),
  quantity: quantitySchema,
  price: priceSchema,
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
  transactedAt: z.string().optional(),
  accountId: z.string().optional(),
});

export type TransactionItemFormData = z.infer<typeof transactionItemSchema>;

/**
 * 멀티 거래 폼 스키마 (클라이언트용)
 * - react-hook-form과 연동
 * - type은 전역으로 지정 (모든 아이템에 동일 적용)
 */
export const multiTransactionFormSchema = z.object({
  type: z.enum(["buy", "sell"]),
  transactedAt: z.string().min(1, "거래일을 선택해주세요."),
  accountId: z.string().min(1, "계좌를 선택해주세요."),
  items: z
    .array(transactionItemSchema)
    .min(1, "최소 1개 이상의 종목을 입력해주세요.")
    .max(20, "한 번에 최대 20개까지 등록 가능합니다."),
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
  transactedAt: undefined,
  accountId: undefined,
};
