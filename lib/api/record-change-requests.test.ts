import { describe, expect, it, vi } from "vitest";
import {
  deleteLedgerEntryWithBalanceSync,
  updateLedgerEntryWithBalanceSync,
} from "@/lib/api/ledger";
import { deleteTransaction, updateTransaction } from "@/lib/api/transaction";
import type { RecordChangeRequest } from "@/types";
import { APIError } from "./error";
import {
  applyApprovedRecordChangeRequest,
  assertCanCancelRecordChangeRequest,
  assertCanResolveRecordChangeRequest,
  buildRecordChangeRequestInsert,
  getRecordChangeRequestListQuery,
  validateLedgerRecordChangeRequestInput,
  validateRecordChangeRequestTarget,
  validateStockTransactionRecordChangeRequestInput,
} from "./record-change-requests";

vi.mock("@/lib/api/ledger", () => ({
  deleteLedgerEntryWithBalanceSync: vi.fn().mockResolvedValue(undefined),
  updateLedgerEntryWithBalanceSync: vi
    .fn()
    .mockResolvedValue({ id: "entry-1" }),
}));

vi.mock("@/lib/api/transaction", () => ({
  deleteTransaction: vi.fn().mockResolvedValue(undefined),
  updateTransaction: vi.fn().mockResolvedValue({ id: "tx-1" }),
}));

const sharedLedgerEntry = {
  id: "entry-1",
  household_id: "household-1",
  owner_id: "owner-1",
  type: "expense",
  amount: 12000,
  title: "점심",
  category_id: "category-1",
  is_shared: true,
  memo: "김밥",
  transacted_at: "2026-06-01T00:00:00.000Z",
  categories: { name: "식비", icon: "utensils" },
  profiles: { name: "소유자" },
};

function createTargetSupabaseMock(row: unknown) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: row, error: null }),
  };

  return {
    from: vi.fn(() => builder),
    builder,
  };
}

describe("validateRecordChangeRequestTarget", () => {
  it("공용 가계부 기록의 대상 소유자와 스냅샷을 만든다", async () => {
    const supabase = createTargetSupabaseMock(sharedLedgerEntry);

    const result = await validateRecordChangeRequestTarget(
      supabase as never,
      "requester-1",
      {
        targetType: "ledger_entry",
        targetId: "entry-1",
        requestType: "delete",
      },
    );

    expect(result).toEqual({
      householdId: "household-1",
      targetOwnerId: "owner-1",
      targetSnapshot: {
        targetType: "ledger_entry",
        ownerName: "소유자",
        transactedAt: "2026-06-01T00:00:00.000Z",
        title: "점심",
        amount: 12000,
        type: "expense",
        categoryName: "식비",
        isShared: true,
      },
    });
  });

  it("개인 가계부 기록은 요청 대상으로 거부한다", async () => {
    const supabase = createTargetSupabaseMock({
      ...sharedLedgerEntry,
      is_shared: false,
    });

    await expect(
      validateRecordChangeRequestTarget(supabase as never, "requester-1", {
        targetType: "ledger_entry",
        targetId: "entry-1",
        requestType: "delete",
      }),
    ).rejects.toMatchObject(
      new APIError(
        "RECORD_CHANGE_REQUEST_TARGET_INVALID",
        "개인 가계부 기록은 요청 대상이 될 수 없습니다.",
        400,
      ),
    );
  });

  it("대상 소유자는 본인 기록에 요청을 만들 수 없다", async () => {
    const supabase = createTargetSupabaseMock(sharedLedgerEntry);

    await expect(
      validateRecordChangeRequestTarget(supabase as never, "owner-1", {
        targetType: "ledger_entry",
        targetId: "entry-1",
        requestType: "delete",
      }),
    ).rejects.toMatchObject(
      new APIError(
        "RECORD_CHANGE_REQUEST_SELF_TARGET",
        "본인 기록에는 변경 요청을 만들 수 없습니다.",
        400,
      ),
    );
  });

  it("이체 가계부 기록은 수정 요청 대상으로 거부한다", async () => {
    const supabase = createTargetSupabaseMock({
      ...sharedLedgerEntry,
      type: "transfer",
    });

    await expect(
      validateRecordChangeRequestTarget(supabase as never, "requester-1", {
        targetType: "ledger_entry",
        targetId: "entry-1",
        requestType: "update",
      } as never),
    ).rejects.toMatchObject(
      new APIError(
        "RECORD_CHANGE_REQUEST_TARGET_INVALID",
        "이체 기록은 삭제 요청만 보낼 수 있습니다.",
        400,
      ),
    );
  });
});

describe("validateLedgerRecordChangeRequestInput", () => {
  it("가계부 수정 요청에서 허용되지 않은 변경 필드를 거부한다", () => {
    expect(() =>
      validateLedgerRecordChangeRequestInput({
        targetType: "ledger_entry",
        targetId: "00000000-0000-4000-8000-000000000001",
        requestType: "update",
        proposedChanges: { type: "income" },
      }),
    ).toThrow(APIError);
  });

  it("가계부 수정 요청에서 빈 변경안을 거부한다", () => {
    expect(() =>
      validateLedgerRecordChangeRequestInput({
        targetType: "ledger_entry",
        targetId: "00000000-0000-4000-8000-000000000001",
        requestType: "update",
        proposedChanges: {},
      }),
    ).toThrow(APIError);
  });

  it("가계부 삭제 요청은 변경안 없이 허용한다", () => {
    expect(() =>
      validateLedgerRecordChangeRequestInput({
        targetType: "ledger_entry",
        targetId: "00000000-0000-4000-8000-000000000001",
        requestType: "delete",
        proposedChanges: {},
      }),
    ).not.toThrow();
  });
});

describe("validateStockTransactionRecordChangeRequestInput", () => {
  it("주식 거래 수정 요청에서 허용되지 않은 변경 필드를 거부한다", () => {
    expect(() =>
      validateStockTransactionRecordChangeRequestInput({
        targetType: "stock_transaction",
        targetId: "00000000-0000-4000-8000-000000000001",
        requestType: "update",
        proposedChanges: { ticker: "AAPL" },
      }),
    ).toThrow(APIError);
  });

  it("주식 거래 수정 요청에서 빈 변경안을 거부한다", () => {
    expect(() =>
      validateStockTransactionRecordChangeRequestInput({
        targetType: "stock_transaction",
        targetId: "00000000-0000-4000-8000-000000000001",
        requestType: "update",
        proposedChanges: {},
      }),
    ).toThrow(APIError);
  });

  it("주식 거래 삭제 요청은 삭제 사유가 필요하다", () => {
    expect(() =>
      validateStockTransactionRecordChangeRequestInput({
        targetType: "stock_transaction",
        targetId: "00000000-0000-4000-8000-000000000001",
        requestType: "delete",
        proposedChanges: {},
      }),
    ).toThrow(APIError);
  });
});

describe("buildRecordChangeRequestInsert", () => {
  it("request body의 owner 값 없이 서버 검증 결과로 insert payload를 만든다", () => {
    const result = buildRecordChangeRequestInsert({
      requesterId: "requester-1",
      targetType: "ledger_entry",
      targetId: "entry-1",
      requestType: "update",
      message: "금액 확인 부탁드립니다.",
      proposedChanges: { amount: 13000 },
      validatedTarget: {
        householdId: "household-1",
        targetOwnerId: "owner-1",
        targetSnapshot: { title: "점심" },
      },
    });

    expect(result).toMatchObject({
      household_id: "household-1",
      requester_id: "requester-1",
      target_owner_id: "owner-1",
      target_type: "ledger_entry",
      target_id: "entry-1",
      request_type: "update",
      status: "pending",
      message: "금액 확인 부탁드립니다.",
      proposed_changes: { amount: 13000 },
      target_snapshot: { title: "점심" },
    });
  });
});

describe("getRecordChangeRequestListQuery", () => {
  it("received box는 target_owner_id로 필터링한다", () => {
    const query = getRecordChangeRequestListQuery("user-1", {
      box: "received",
      status: "pending",
    });

    expect(query).toEqual({
      ownerColumn: "target_owner_id",
      ownerId: "user-1",
      status: "pending",
    });
  });
});

describe("status action guards", () => {
  const pendingRequest = {
    id: "request-1",
    requester_id: "requester-1",
    target_owner_id: "owner-1",
    status: "pending" as const,
  };

  it("요청자만 pending 요청을 취소할 수 있다", () => {
    expect(() =>
      assertCanCancelRecordChangeRequest(pendingRequest, "requester-1"),
    ).not.toThrow();
    expect(() =>
      assertCanCancelRecordChangeRequest(pendingRequest, "owner-1"),
    ).toThrow(APIError);
  });

  it("대상 소유자만 pending 요청을 처리할 수 있다", () => {
    expect(() =>
      assertCanResolveRecordChangeRequest(pendingRequest, "owner-1"),
    ).not.toThrow();
    expect(() =>
      assertCanResolveRecordChangeRequest(pendingRequest, "requester-1"),
    ).toThrow(APIError);
  });

  it("terminal 상태 요청은 취소하거나 처리할 수 없다", () => {
    const approvedRequest = { ...pendingRequest, status: "approved" as const };

    expect(() =>
      assertCanCancelRecordChangeRequest(approvedRequest, "requester-1"),
    ).toThrow(APIError);
    expect(() =>
      assertCanResolveRecordChangeRequest(approvedRequest, "owner-1"),
    ).toThrow(APIError);
  });
});

describe("applyApprovedRecordChangeRequest", () => {
  const baseRequest = {
    id: "request-1",
    requester_id: "requester-1",
    target_owner_id: "owner-1",
    target_type: "ledger_entry",
    target_id: "entry-1",
    request_type: "update",
    proposed_changes: { amount: 10000, title: "팀 점심" },
  } as unknown as RecordChangeRequest;

  it("가계부 수정 요청 승인 시 소유자 권한으로 변경안을 적용한다", async () => {
    await applyApprovedRecordChangeRequest({} as never, baseRequest);

    expect(updateLedgerEntryWithBalanceSync).toHaveBeenCalledWith(
      {},
      "entry-1",
      "owner-1",
      {
        amount: 10000,
        title: "팀 점심",
      },
    );
  });

  it("가계부 삭제 요청 승인 시 소유자 권한으로 삭제한다", async () => {
    await applyApprovedRecordChangeRequest({} as never, {
      ...baseRequest,
      request_type: "delete",
      proposed_changes: {},
    });

    expect(deleteLedgerEntryWithBalanceSync).toHaveBeenCalledWith(
      {},
      "entry-1",
      "owner-1",
    );
  });

  function createStockApplySupabaseMock(row: unknown) {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    };

    return {
      from: vi.fn(() => builder),
      builder,
    };
  }

  const stockRequest = {
    id: "request-1",
    household_id: "household-1",
    requester_id: "requester-1",
    target_owner_id: "owner-1",
    target_type: "stock_transaction",
    target_id: "tx-1",
    request_type: "update",
    proposed_changes: {
      quantity: 12,
      price: 71000,
      transactedAt: "2026-06-02T00:00:00.000Z",
      accountId: "00000000-0000-4000-8000-000000000002",
      memo: "정정",
    },
    target_snapshot: {
      targetType: "stock_transaction",
      ticker: "005930",
      type: "buy",
      quantity: 10,
      price: 70000,
      transactedAt: "2026-06-01T00:00:00.000Z",
      accountId: "00000000-0000-4000-8000-000000000001",
    },
  } as unknown as RecordChangeRequest;

  const currentStockTransaction = {
    id: "tx-1",
    household_id: "household-1",
    owner_id: "owner-1",
    ticker: "005930",
    type: "buy",
    quantity: 10,
    price: 70000,
    transacted_at: "2026-06-01T00:00:00.000Z",
    account_id: "00000000-0000-4000-8000-000000000001",
    memo: null,
  };

  it("주식 거래 수정 요청 승인 시 기존 거래 수정 함수에 위임한다", async () => {
    const supabase = createStockApplySupabaseMock(currentStockTransaction);

    await applyApprovedRecordChangeRequest(supabase as never, stockRequest);

    expect(updateTransaction).toHaveBeenCalledWith(
      supabase,
      "tx-1",
      "household-1",
      "owner-1",
      {
        quantity: 12,
        price: 71000,
        transactedAt: "2026-06-02T00:00:00.000Z",
        accountId: "00000000-0000-4000-8000-000000000002",
        memo: "정정",
      },
    );
  });

  it("주식 거래 삭제 요청 승인 시 기존 거래 삭제 함수에 위임한다", async () => {
    const supabase = createStockApplySupabaseMock(currentStockTransaction);

    await applyApprovedRecordChangeRequest(
      supabase as never,
      {
        ...stockRequest,
        request_type: "delete",
        proposed_changes: {},
        message: "중복 거래",
      } as unknown as RecordChangeRequest,
    );

    expect(deleteTransaction).toHaveBeenCalledWith(
      supabase,
      "tx-1",
      "household-1",
      "owner-1",
    );
  });

  it("주식 거래가 요청 이후 변경되었으면 승인을 거부한다", async () => {
    const supabase = createStockApplySupabaseMock({
      ...currentStockTransaction,
      quantity: 8,
    });

    await expect(
      applyApprovedRecordChangeRequest(supabase as never, stockRequest),
    ).rejects.toMatchObject(
      new APIError(
        "RECORD_CHANGE_REQUEST_TARGET_STALE",
        "요청 이후 대상 기록이 변경되었습니다. 새 요청이 필요합니다.",
        409,
      ),
    );
  });
});
