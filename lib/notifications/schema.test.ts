import { describe, expect, it } from "vitest";
import { buildNotificationHref } from "./links";
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

describe("buildNotificationHref", () => {
  it("가계부 기록 상세 링크를 만든다", () => {
    expect(
      buildNotificationHref({
        linkKind: "ledger_record_detail",
        linkParams: { entryId: "entry-1" },
      }),
    ).toBe("/ledger/records/entry-1?from=notification");
  });

  it("주식 거래 상세 링크를 만든다", () => {
    expect(
      buildNotificationHref({
        linkKind: "stock_transaction_detail",
        linkParams: { transactionId: "tx-1" },
      }),
    ).toBe("/assets/stock/transactions/tx-1?from=notification");
  });
});
