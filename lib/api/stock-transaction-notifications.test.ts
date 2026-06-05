import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUserNotification } from "@/lib/api/notifications";
import {
  notifyBatchStockTransactionsCreated,
  notifyStockTransactionCreated,
  notifyStockTransactionDeleted,
  notifyStockTransactionUpdated,
} from "./stock-transaction-notifications";

vi.mock("@/lib/api/notifications", () => ({
  createUserNotification: vi.fn().mockResolvedValue({ id: "notification-1" }),
}));

const createUserNotificationMock = vi.mocked(createUserNotification);

const transaction = {
  id: "00000000-0000-4000-8000-000000000201",
  household_id: "household-1",
  owner_id: "owner-1",
  ticker: "AAPL",
  type: "buy" as const,
  quantity: 3,
  price: 195.5,
  transacted_at: "2026-06-03T03:00:00.000Z",
  memo: null,
  account_id: "account-1",
  created_at: "2026-06-03T03:10:00.000Z",
};

function createStockNotificationSupabaseMock() {
  const householdMembersBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockResolvedValue({
      data: [{ user_id: "member-1" }, { user_id: "member-2" }],
      error: null,
    }),
  };
  const profilesBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { name: "홍길동" },
      error: null,
    }),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "household_members") return householdMembersBuilder;
      if (table === "profiles") return profilesBuilder;
      throw new Error(`Unexpected table: ${table}`);
    }),
    householdMembersBuilder,
    profilesBuilder,
  };
}

describe("stock transaction notification helpers", () => {
  beforeEach(() => {
    createUserNotificationMock.mockClear();
    vi.useRealTimers();
  });

  it("단건 생성은 작성자를 제외한 가구 구성원에게 생성 알림을 만든다", async () => {
    const supabase = createStockNotificationSupabaseMock();

    await notifyStockTransactionCreated(supabase as never, {
      actorId: "owner-1",
      householdId: "household-1",
      transaction,
    });

    expect(supabase.from).toHaveBeenCalledWith("household_members");
    expect(supabase.householdMembersBuilder.neq).toHaveBeenCalledWith(
      "user_id",
      "owner-1",
    );
    expect(createUserNotificationMock).toHaveBeenCalledTimes(2);
    expect(createUserNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "member-1",
        householdId: "household-1",
        type: "stock_transaction_created",
        title: "새 주식 거래가 추가되었습니다",
        body: "홍길동님이 AAPL 매수 3주를 추가했습니다.",
        link: {
          kind: "stock_record_date",
          params: { date: "2026-06-03" },
        },
        source: {
          type: "stock_transaction",
          id: "00000000-0000-4000-8000-000000000201",
        },
        dedupeKey:
          "stock_transaction_created:00000000-0000-4000-8000-000000000201",
      }),
    );
  });

  it("batch 생성은 가장 최신 거래일로 이동하는 수신자별 요약 알림 1개를 만든다", async () => {
    const supabase = createStockNotificationSupabaseMock();

    await notifyBatchStockTransactionsCreated(supabase as never, {
      actorId: "owner-1",
      householdId: "household-1",
      transactions: [
        {
          ...transaction,
          id: "00000000-0000-4000-8000-000000000202",
          transacted_at: "2026-06-01T03:00:00.000Z",
        },
        transaction,
      ],
    });

    expect(createUserNotificationMock).toHaveBeenCalledTimes(2);
    expect(createUserNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "member-1",
        type: "stock_transaction_created",
        title: "주식 거래 2건이 추가되었습니다",
        body: "홍길동님이 2026-06-03 기준 주식 거래 2건을 추가했습니다.",
        link: {
          kind: "stock_record_date",
          params: { date: "2026-06-03" },
        },
        source: null,
        dedupeKey:
          "stock_transaction_batch_created:owner-1:00000000-0000-4000-8000-000000000202,00000000-0000-4000-8000-000000000201",
      }),
    );
  });

  it("수정 알림은 수정 후 거래일로 이동한다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-05T00:00:00.000Z"));
    const supabase = createStockNotificationSupabaseMock();

    await notifyStockTransactionUpdated(supabase as never, {
      actorId: "owner-1",
      transaction: {
        ...transaction,
        quantity: 5,
        transacted_at: "2026-06-04T03:00:00.000Z",
      },
    });

    expect(createUserNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "stock_transaction_changed",
        title: "주식 거래가 수정되었습니다",
        body: "홍길동님이 AAPL 매수 기록을 수정했습니다.",
        link: {
          kind: "stock_record_date",
          params: { date: "2026-06-04" },
        },
        dedupeKey:
          "stock_transaction_updated:00000000-0000-4000-8000-000000000201:1780617600000",
      }),
    );
  });

  it("삭제 알림은 삭제 전 거래일로 이동한다", async () => {
    const supabase = createStockNotificationSupabaseMock();

    await notifyStockTransactionDeleted(supabase as never, {
      actorId: "owner-1",
      transaction,
    });

    expect(createUserNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "stock_transaction_changed",
        title: "주식 거래가 삭제되었습니다",
        body: "홍길동님이 AAPL 매수 기록을 삭제했습니다.",
        link: {
          kind: "stock_record_date",
          params: { date: "2026-06-03" },
        },
        source: {
          type: "stock_transaction",
          id: "00000000-0000-4000-8000-000000000201",
        },
        dedupeKey:
          "stock_transaction_deleted:00000000-0000-4000-8000-000000000201",
      }),
    );
  });

  it("알림 생성 실패는 원본 작업으로 전파하지 않는다", async () => {
    const supabase = createStockNotificationSupabaseMock();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    createUserNotificationMock.mockRejectedValueOnce(
      new Error("notification insert failed"),
    );

    await expect(
      notifyStockTransactionCreated(supabase as never, {
        actorId: "owner-1",
        householdId: "household-1",
        transaction,
      }),
    ).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Stock transaction notification creation error (created):",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
