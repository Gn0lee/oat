import { describe, expect, it } from "vitest";
import { notificationPreferenceBatchUpdateSchema } from "./schema";

describe("notificationPreferenceBatchUpdateSchema", () => {
  it("여러 알림 설정 업데이트를 받는다", () => {
    const result = notificationPreferenceBatchUpdateSchema.safeParse({
      updates: [
        {
          type: "ledger_record_change_request",
          inAppEnabled: true,
          pushEnabled: true,
        },
        {
          type: "stock_transaction_changed",
          inAppEnabled: true,
          pushEnabled: true,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("같은 알림 종류가 중복되면 거부한다", () => {
    const result = notificationPreferenceBatchUpdateSchema.safeParse({
      updates: [
        {
          type: "ledger_record_change_request",
          inAppEnabled: true,
          pushEnabled: true,
        },
        {
          type: "ledger_record_change_request",
          inAppEnabled: true,
          pushEnabled: false,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
