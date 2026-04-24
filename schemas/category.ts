import { z } from "zod";

const categoryTypeValues = ["expense", "income"] as const;

export const createCategorySchema = z.object({
  type: z.enum(categoryTypeValues, {
    message: "유효한 카테고리 유형이 아닙니다.",
  }),
  name: z
    .string()
    .min(1, "카테고리명을 입력해주세요.")
    .max(20, "카테고리명은 20자 이내여야 합니다."),
  icon: z
    .string()
    .max(50, "아이콘명은 50자 이내여야 합니다.")
    .nullable()
    .optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(1, "카테고리명을 입력해주세요.")
    .max(20, "카테고리명은 20자 이내여야 합니다.")
    .optional(),
  icon: z
    .string()
    .max(50, "아이콘명은 50자 이내여야 합니다.")
    .nullable()
    .optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const reorderCategoriesSchema = z.object({
  orders: z
    .array(
      z.object({
        id: z.string().uuid("유효하지 않은 카테고리 ID입니다."),
        displayOrder: z.number().int().min(0, "순서는 0 이상이어야 합니다."),
      }),
    )
    .min(1, "순서 변경 항목이 없습니다."),
});

export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;
