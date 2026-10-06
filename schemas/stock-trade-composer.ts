import { z } from "zod";
import { batchTransactionItemSchema } from "@/schemas/transaction";

const stockSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  market: z.enum(["KR", "US", "OTHER"]),
  exchange: z.string().nullable(),
});

/**
 * 주식 거래 컴포저의 한 행 = 주식 거래 한 건.
 * 매수/매도·거래일·계좌를 거래마다 가진다. type은 기본값 없이 비어 있다.
 */
export const stockTradeComposerItemSchema = z
  .object({
    clientId: z.string().min(1),
    type: z.enum(["buy", "sell"]).nullable(),
    stock: stockSchema.nullable(),
    quantity: z.string(),
    price: z.string(),
    transactedAt: z.string(),
    accountId: z.string(),
    memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
  })
  .superRefine((item, ctx) => {
    if (!item.type) {
      ctx.addIssue({
        code: "custom",
        path: ["type"],
        message: "매수 또는 매도를 선택해 주세요.",
      });
    }
    if (!item.stock) {
      ctx.addIssue({
        code: "custom",
        path: ["stock"],
        message: "종목을 선택해 주세요.",
      });
    }
    if (
      !item.quantity.trim() ||
      !batchTransactionItemSchema.shape.quantity.safeParse(
        Number(item.quantity),
      ).success
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "유효한 수량을 입력해 주세요.",
      });
    }
    if (
      !item.price.trim() ||
      !batchTransactionItemSchema.shape.price.safeParse(Number(item.price))
        .success
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["price"],
        message: "유효한 단가를 입력해 주세요.",
      });
    }
    if (!item.transactedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["transactedAt"],
        message: "거래일을 선택해 주세요.",
      });
    }
    if (!item.accountId) {
      ctx.addIssue({
        code: "custom",
        path: ["accountId"],
        message: "계좌를 선택해 주세요.",
      });
    }
  });

export const stockTradeComposerSchema = z.object({
  items: z
    .array(stockTradeComposerItemSchema)
    .min(1, "최소 한 건을 입력해 주세요.")
    .max(20, "한 번에 최대 20건까지 저장할 수 있습니다."),
});

export type StockTradeComposerItem = z.infer<
  typeof stockTradeComposerItemSchema
>;
export type StockTradeComposerValues = z.infer<typeof stockTradeComposerSchema>;
