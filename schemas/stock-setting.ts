import { z } from "zod";

/**
 * 종목 설정 수정 스키마
 * - riskLevel: 위험도 (nullable - 미설정 가능)
 * - 자산유형은 읽기 전용이므로 수정 대상 아님
 */
export const updateStockSettingSchema = z.object({
  riskLevel: z
    .enum(["safe", "moderate", "aggressive"], {
      message: "위험도를 선택해주세요.",
    })
    .nullable(),
});

export type UpdateStockSettingInput = z.infer<typeof updateStockSettingSchema>;
