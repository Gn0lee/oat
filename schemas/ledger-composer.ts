import { z } from "zod";

export const ledgerComposerItemSchema = z
  .object({
    clientId: z.string().min(1),
    type: z.enum(["expense", "income", "transfer", "non_expense_withdrawal"]),
    bookId: z.string().uuid(),
    amount: z.string(),
    title: z.string(),
    categoryId: z.string().optional(),
    paymentMethodId: z.string().optional(),
    accountId: z.string().optional(),
    fromValue: z.string().optional(),
    toValue: z.string().optional(),
    transactedAt: z.string(),
    memo: z.string().max(500).optional(),
  })
  .superRefine((item, ctx) => {
    if (!item.title.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message: "내용을 입력해 주세요.",
      });
    }
    if (!item.amount.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "금액을 입력해 주세요.",
      });
    } else if (
      !Number.isFinite(Number(item.amount)) ||
      Number(item.amount) <= 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "금액은 0보다 커야 합니다.",
      });
    }
    if (!item.transactedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["transactedAt"],
        message: "날짜를 선택해 주세요.",
      });
    }
    if (
      (item.type === "expense" || item.type === "income") &&
      !item.categoryId
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "카테고리를 선택해 주세요.",
      });
    }
    if (
      item.type === "non_expense_withdrawal" &&
      !item.accountId &&
      !item.paymentMethodId
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["accountId"],
        message: "출금처를 선택해 주세요.",
      });
    }
    if (item.type === "transfer") {
      if (!item.fromValue) {
        ctx.addIssue({
          code: "custom",
          path: ["fromValue"],
          message: "출발지를 선택해 주세요.",
        });
      }
      if (!item.toValue) {
        ctx.addIssue({
          code: "custom",
          path: ["toValue"],
          message: "도착지를 선택해 주세요.",
        });
      }
      if (item.fromValue && item.fromValue === item.toValue) {
        ctx.addIssue({
          code: "custom",
          path: ["fromValue"],
          message: "서로 다른 출발지와 도착지를 선택해 주세요.",
        });
      }
    }
  });

export const ledgerComposerSchema = z.object({
  items: z.array(ledgerComposerItemSchema).min(1, "최소 한 건을 추가해주세요."),
});

export type LedgerComposerItem = z.infer<typeof ledgerComposerItemSchema>;
export type LedgerComposerValues = z.infer<typeof ledgerComposerSchema>;
