import { z } from "zod";

/**
 * 거래 생성 요청 스키마
 */
export const createTransactionSchema = z.object({
  ticker: z.string().min(1, "종목 코드는 필수입니다."),
  type: z.enum(["buy", "sell"], {
    message: "거래 유형은 buy 또는 sell이어야 합니다.",
  }),
  quantity: z
    .number()
    .positive("수량은 0보다 커야 합니다.")
    .max(999999999, "수량이 너무 큽니다."),
  price: z
    .number()
    .min(0, "가격은 0 이상이어야 합니다.")
    .max(999999999999, "가격이 너무 큽니다."),
  transactedAt: z
    .string()
    .datetime({ message: "유효한 날짜 형식이 아닙니다." }),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
  accountId: z.string().uuid("유효한 계좌 ID가 아닙니다."),

  // 종목 정보 (첫 거래 시 household_stock_settings 생성용)
  stock: z.object({
    name: z.string().min(1, "종목명은 필수입니다."),
    market: z.enum(["KR", "US", "OTHER"]),
    currency: z.enum(["KRW", "USD"]),
    assetType: z
      .enum(["equity", "bond", "cash", "commodity", "crypto", "alternative"])
      .optional()
      .default("equity"),
  }),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

/**
 * 거래 수정 요청 스키마
 * - 수정 가능: quantity, price, transactedAt, memo
 * - 수정 불가: ticker, type (삭제 후 재등록 필요)
 */
export const updateTransactionSchema = z.object({
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
    .datetime({ message: "유효한 날짜 형식이 아닙니다." })
    .optional(),
  memo: z
    .string()
    .max(500, "메모는 500자 이내여야 합니다.")
    .nullable()
    .optional(),
  accountId: z
    .string()
    .uuid("유효한 계좌 ID가 아닙니다.")
    .nullable()
    .optional(),
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

/**
 * 배치 거래 항목 스키마
 */
export const batchTransactionItemSchema = z.object({
  ticker: z.string().min(1, "종목 코드는 필수입니다."),
  quantity: z
    .number()
    .positive("수량은 0보다 커야 합니다.")
    .max(999999999, "수량이 너무 큽니다."),
  price: z
    .number()
    .min(0, "가격은 0 이상이어야 합니다.")
    .max(999999999999, "가격이 너무 큽니다."),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
  stock: z.object({
    name: z.string().min(1, "종목명은 필수입니다."),
    market: z.enum(["KR", "US", "OTHER"]),
    currency: z.enum(["KRW", "USD"]),
    assetType: z
      .enum(["equity", "bond", "cash", "commodity", "crypto", "alternative"])
      .optional()
      .default("equity"),
  }),
});

export type BatchTransactionItem = z.infer<typeof batchTransactionItemSchema>;

/**
 * 배치 거래 생성 요청 스키마
 * - type은 전역으로 지정 (모든 아이템에 동일 적용)
 */
export const createBatchTransactionSchema = z.object({
  type: z.enum(["buy", "sell"], {
    message: "거래 유형은 buy 또는 sell이어야 합니다.",
  }),
  transactedAt: z
    .string()
    .datetime({ message: "유효한 날짜 형식이 아닙니다." }),
  accountId: z.string().uuid("유효한 계좌 ID가 아닙니다."),
  items: z
    .array(batchTransactionItemSchema)
    .min(1, "최소 1개 이상의 거래가 필요합니다.")
    .max(20, "한 번에 최대 20개까지 등록 가능합니다."),
});

export type CreateBatchTransactionInput = z.infer<
  typeof createBatchTransactionSchema
>;
