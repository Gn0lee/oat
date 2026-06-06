import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUserNotification } from "@/lib/api/notifications";
import { notifyRecordChangeRequestResult } from "./record-change-request-notifications";

vi.mock("@/lib/api/notifications", () => ({
  createUserNotification: vi.fn().mockResolvedValue({ id: "notification-1" }),
}));

const createUserNotificationMock = vi.mocked(createUserNotification);

describe("record change request result notification helpers", () => {
  beforeEach(() => {
    createUserNotificationMock.mockClear();
  });

  it("승인 결과는 요청자에게 요청 상세 링크로 알린다", async () => {
    await notifyRecordChangeRequestResult({
      id: "00000000-0000-4000-8000-000000000401",
      household_id: "household-1",
      requester_id: "requester-1",
      target_owner_id: "owner-1",
      target_type: "ledger_entry",
      status: "approved",
      response_message: "반영했습니다.",
    });

    expect(createUserNotificationMock).toHaveBeenCalledWith({
      recipientId: "requester-1",
      householdId: "household-1",
      type: "ledger_request_result",
      title: "가계부 변경 요청이 승인되었습니다",
      body: "반영했습니다.",
      link: {
        kind: "record_change_request_detail",
        params: { requestId: "00000000-0000-4000-8000-000000000401" },
      },
      source: {
        type: "record_change_request",
        id: "00000000-0000-4000-8000-000000000401",
      },
      dedupeKey:
        "record_change_request_result:00000000-0000-4000-8000-000000000401:approved",
    });
  });

  it("거절 결과는 주식 요청자에게 주식 결과 타입으로 알린다", async () => {
    await notifyRecordChangeRequestResult({
      id: "00000000-0000-4000-8000-000000000402",
      household_id: "household-1",
      requester_id: "requester-1",
      target_owner_id: "owner-1",
      target_type: "stock_transaction",
      status: "rejected",
      response_message: null,
    });

    expect(createUserNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "requester-1",
        type: "stock_transaction_request_result",
        title: "주식 거래 변경 요청이 거절되었습니다",
        body: null,
        dedupeKey:
          "record_change_request_result:00000000-0000-4000-8000-000000000402:rejected",
      }),
    );
  });

  it("취소 결과는 대상 소유자에게 알린다", async () => {
    await notifyRecordChangeRequestResult({
      id: "00000000-0000-4000-8000-000000000403",
      household_id: "household-1",
      requester_id: "requester-1",
      target_owner_id: "owner-1",
      target_type: "ledger_entry",
      status: "cancelled",
      response_message: null,
    });

    expect(createUserNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "owner-1",
        type: "ledger_request_result",
        title: "가계부 변경 요청이 취소되었습니다",
        dedupeKey:
          "record_change_request_result:00000000-0000-4000-8000-000000000403:cancelled",
      }),
    );
  });

  it("알림 생성 실패는 요청 처리 결과로 전파하지 않는다", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    createUserNotificationMock.mockRejectedValueOnce(
      new Error("notification insert failed"),
    );

    await expect(
      notifyRecordChangeRequestResult({
        id: "00000000-0000-4000-8000-000000000404",
        household_id: "household-1",
        requester_id: "requester-1",
        target_owner_id: "owner-1",
        target_type: "ledger_entry",
        status: "approved",
        response_message: null,
      }),
    ).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Record change request result notification creation error:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
