import { describe, expect, it } from "vitest";
import {
  createRecordChangeRequestSchema,
  listRecordChangeRequestsSchema,
  resolveRecordChangeRequestSchema,
} from "./record-change-request";

const uuid = "00000000-0000-4000-8000-000000000001";

describe("createRecordChangeRequestSchema", () => {
  it("수정 요청은 대상, 요청 유형, 변경안을 허용한다", () => {
    const result = createRecordChangeRequestSchema.safeParse({
      targetType: "ledger_entry",
      targetId: uuid,
      requestType: "update",
      message: "금액이 잘못된 것 같아요.",
      proposedChanges: { amount: 12000, memo: "정정 요청" },
    });

    expect(result.success).toBe(true);
  });

  it("삭제 요청은 proposedChanges 없이 메시지만으로 생성할 수 있다", () => {
    const result = createRecordChangeRequestSchema.safeParse({
      targetType: "stock_transaction",
      targetId: uuid,
      requestType: "delete",
      message: "중복 등록된 거래입니다.",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.proposedChanges).toEqual({});
    }
  });

  it("알 수 없는 대상 유형은 거부한다", () => {
    const result = createRecordChangeRequestSchema.safeParse({
      targetType: "payment_method",
      targetId: uuid,
      requestType: "update",
      proposedChanges: {},
    });

    expect(result.success).toBe(false);
  });
});

describe("listRecordChangeRequestsSchema", () => {
  it("box와 status 필터를 파싱한다", () => {
    const result = listRecordChangeRequestsSchema.safeParse({
      box: "received",
      status: "pending",
    });

    expect(result.success).toBe(true);
  });
});

describe("resolveRecordChangeRequestSchema", () => {
  it("승인 결정을 파싱한다", () => {
    const result = resolveRecordChangeRequestSchema.safeParse({
      decision: "approved",
    });

    expect(result.success).toBe(true);
  });

  it("거절 응답 메시지를 파싱한다", () => {
    const result = resolveRecordChangeRequestSchema.safeParse({
      decision: "rejected",
      responseMessage: "이미 제가 수정했습니다.",
    });

    expect(result.success).toBe(true);
  });
});
