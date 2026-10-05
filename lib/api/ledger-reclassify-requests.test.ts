import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUserNotification } from "@/lib/api/notifications";
import type { RecordChangeRequest } from "@/types";
import { APIError } from "./error";
import {
  createLedgerReclassifyRequest,
  resolveLedgerReclassifyRequest,
  throwLedgerReclassifyError,
} from "./ledger-reclassify-requests";

vi.mock("@/lib/api/notifications", () => ({
  createUserNotification: vi.fn().mockResolvedValue(undefined),
}));

const entryId = "00000000-0000-4000-8000-000000000001";
const bookId = "00000000-0000-4000-8000-000000000002";

const pendingRequest = {
  id: "request-1",
  household_id: "household-1",
  requester_id: "requester-1",
  target_owner_id: "owner-1",
  target_type: "ledger_entry",
  target_id: entryId,
  request_type: "reclassify",
  status: "pending",
  message: "여행 장부로 옮겨주세요",
  proposed_changes: { bookId },
  target_snapshot: { sourceBookName: "생활비", destinationBookName: "여행" },
  response_message: null,
  resolved_at: null,
  created_at: "2026-10-05T00:00:00Z",
  updated_at: "2026-10-05T00:00:00Z",
} as RecordChangeRequest;

function rpcMock(result: { data: unknown; error: unknown }) {
  return { rpc: vi.fn().mockResolvedValue(result) };
}

beforeEach(() => {
  vi.mocked(createUserNotification).mockClear();
});

describe("createLedgerReclassifyRequest", () => {
  it("RPC에 bookId와 기록 버전을 넘기고 작성자에게 알린다", async () => {
    const supabase = rpcMock({ data: pendingRequest, error: null });

    const result = await createLedgerReclassifyRequest(supabase as never, {
      targetType: "ledger_entry",
      targetId: entryId,
      requestType: "reclassify",
      message: "여행 장부로 옮겨주세요",
      proposedChanges: { bookId },
      expectedEntryUpdatedAt: "2026-10-05T01:02:03.123456+00:00",
    });

    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_ledger_reclassify_request",
      {
        p_entry_id: entryId,
        p_book_id: bookId,
        p_expected_entry_updated_at: "2026-10-05T01:02:03.123456+00:00",
        p_message: "여행 장부로 옮겨주세요",
      },
    );
    expect(result).toBe(pendingRequest);
    expect(createUserNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "owner-1",
        householdId: "household-1",
        type: "ledger_record_change_request",
        title: "장부 이동 요청이 도착했습니다",
        link: {
          kind: "record_change_request_detail",
          params: { requestId: "request-1" },
        },
        dedupeKey: "record_change_request_created:request-1",
      }),
    );
  });

  it("오래된 기록 버전은 ENTRY_CHANGED 409로 알린다", async () => {
    const supabase = rpcMock({
      data: null,
      error: { code: "23514", message: "ENTRY_CHANGED" },
    });

    await expect(
      createLedgerReclassifyRequest(supabase as never, {
        targetType: "ledger_entry",
        targetId: entryId,
        requestType: "reclassify",
        proposedChanges: { bookId },
        expectedEntryUpdatedAt: "2026-10-05T01:02:03Z",
      }),
    ).rejects.toMatchObject({ code: "ENTRY_CHANGED", statusCode: 409 });
    expect(createUserNotification).not.toHaveBeenCalled();
  });
});

describe("throwLedgerReclassifyError", () => {
  it.each([
    ["REQUEST_ALREADY_PENDING", 409],
    ["REQUEST_NOT_PENDING", 409],
    ["BOOK_ARCHIVED", 409],
    ["BOOK_UNAVAILABLE", 404],
    ["REQUEST_TARGET_NOT_FOUND", 404],
    ["REQUEST_NOT_FOUND", 404],
    ["REQUEST_FORBIDDEN", 403],
    ["REQUEST_SELF_TARGET", 400],
    ["RECLASSIFY_DESTINATION_INVALID", 400],
    ["VALIDATION_ERROR", 400],
    ["AUTH_UNAUTHORIZED", 401],
  ])("%s는 %i로 매핑한다", (code, status) => {
    expect(() => throwLedgerReclassifyError({ message: code })).toThrow(
      expect.objectContaining({ code, statusCode: status }),
    );
  });

  it("알 수 없는 DB 오류는 500으로 숨긴다", () => {
    expect(() =>
      throwLedgerReclassifyError({ message: "deadlock detected" }),
    ).toThrow(expect.objectContaining({ statusCode: 500 }));
  });
});

describe("resolveLedgerReclassifyRequest", () => {
  it("승인 결과를 반환하고 요청자에게 결과를 알린다", async () => {
    const approved = { ...pendingRequest, status: "approved" };
    const supabase = rpcMock({ data: approved, error: null });

    const result = await resolveLedgerReclassifyRequest(
      supabase as never,
      "request-1",
      { decision: "approved", responseMessage: "좋아요" },
    );

    expect(supabase.rpc).toHaveBeenCalledWith(
      "resolve_ledger_reclassify_request",
      {
        p_request_id: "request-1",
        p_decision: "approved",
        p_response_message: "좋아요",
      },
    );
    expect(result).toBe(approved);
    expect(createUserNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "requester-1",
        title: "장부 이동 요청이 승인되었습니다",
        dedupeKey: "record_change_request_result:request-1:approved",
      }),
    );
  });

  it("승인 시점에 전제가 바뀌었으면 만료를 알리고 REQUEST_EXPIRED 409를 던진다", async () => {
    const supabase = rpcMock({
      data: { ...pendingRequest, status: "expired" },
      error: null,
    });

    await expect(
      resolveLedgerReclassifyRequest(supabase as never, "request-1", {
        decision: "approved",
      }),
    ).rejects.toMatchObject(
      new APIError(
        "REQUEST_EXPIRED",
        "기록이나 장부가 바뀌어 요청이 만료되었습니다. 새 요청이 필요합니다.",
        409,
      ),
    );
    expect(createUserNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "requester-1",
        title: "장부 이동 요청이 만료되었습니다",
        dedupeKey: "record_change_request_result:request-1:expired",
      }),
    );
  });

  it("이미 처리된 요청은 REQUEST_NOT_PENDING 409다", async () => {
    const supabase = rpcMock({
      data: null,
      error: { code: "23514", message: "REQUEST_NOT_PENDING" },
    });

    await expect(
      resolveLedgerReclassifyRequest(supabase as never, "request-1", {
        decision: "rejected",
      }),
    ).rejects.toMatchObject({ code: "REQUEST_NOT_PENDING", statusCode: 409 });
  });
});
