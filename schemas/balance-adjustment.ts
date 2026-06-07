import { z } from "zod";

export const balanceAdjustmentTargetTypeSchema = z.enum([
  "account",
  "payment_method",
]);

export const createBalanceAdjustmentSchema = z.object({
  targetType: balanceAdjustmentTargetTypeSchema,
  accountId: z.uuid().optional(),
  paymentMethodId: z.uuid().optional(),
  actualBalance: z.number(),
  adjustedAt: z.iso.datetime().optional(),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
});

export type CreateBalanceAdjustmentInput = z.infer<
  typeof createBalanceAdjustmentSchema
>;
