import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUserNotification } from "@/lib/api/notifications";
import {
  notifyBatchLedgerEntriesCreated,
  notifyLedgerEntryCreated,
  notifyLedgerEntryDeleted,
  notifyLedgerEntryUpdated,
} from "./ledger-notifications";

vi.mock("@/lib/api/notifications", () => ({
  createUserNotification: vi.fn().mockResolvedValue({ id: "notification-1" }),
}));

const createUserNotificationMock = vi.mocked(createUserNotification);

const sharedEntry = {
  id: "00000000-0000-4000-8000-000000000101",
  household_id: "household-1",
  owner_id: "owner-1",
  type: "expense" as const,
  amount: 52000,
  title: "이마트 장보기",
  category_id: "category-1",
  from_account_id: null,
  from_payment_method_id: "pm-1",
  to_account_id: null,
  to_payment_method_id: null,
  is_shared: true,
  memo: null,
  transacted_at: "2026-06-03T03:00:00.000Z",
  created_at: "2026-06-03T03:10:00.000Z",
  updated_at: "2026-06-03T03:10:00.000Z",
};

function createLedgerNotificationSupabaseMock() {
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

describe("ledger notification helpers", () => {
  beforeEach(() => {
    createUserNotificationMock.mockClear();
  });

  it("공용 단건 생성은 작성자를 제외한 가구 구성원에게 생성 알림을 만든다", async () => {
    const supabase = createLedgerNotificationSupabaseMock();

    await notifyLedgerEntryCreated(supabase as never, {
      actorId: "owner-1",
      householdId: "household-1",
      entry: sharedEntry,
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
        type: "ledger_record_created",
        title: "공용 가계부 기록이 추가되었습니다",
        body: '홍길동님이 "이마트 장보기" 52,000원을 추가했습니다.',
        link: {
          kind: "ledger_record_detail",
          params: { entryId: "00000000-0000-4000-8000-000000000101" },
        },
        source: {
          type: "ledger_entry",
          id: "00000000-0000-4000-8000-000000000101",
        },
      }),
    );
  });

  it("개인 단건 생성은 알림을 만들지 않는다", async () => {
    const supabase = createLedgerNotificationSupabaseMock();

    await notifyLedgerEntryCreated(supabase as never, {
      actorId: "owner-1",
      householdId: "household-1",
      entry: { ...sharedEntry, is_shared: false },
    });

    expect(createUserNotificationMock).not.toHaveBeenCalled();
  });

  it("batch 생성은 공용 항목만 집계해서 수신자별 요약 알림 1개를 만든다", async () => {
    const supabase = createLedgerNotificationSupabaseMock();

    await notifyBatchLedgerEntriesCreated(supabase as never, {
      actorId: "owner-1",
      householdId: "household-1",
      entries: [
        { ...sharedEntry, transacted_at: "2026-06-01T03:00:00.000Z" },
        { ...sharedEntry, id: "00000000-0000-4000-8000-000000000102" },
        {
          ...sharedEntry,
          id: "00000000-0000-4000-8000-000000000103",
          is_shared: false,
          transacted_at: "2026-06-10T03:00:00.000Z",
        },
      ],
    });

    expect(createUserNotificationMock).toHaveBeenCalledTimes(2);
    expect(createUserNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "member-1",
        type: "ledger_record_created",
        title: "공용 가계부 기록 2건이 추가되었습니다",
        body: "홍길동님이 2026-06-03 기준 공용 기록 2건을 추가했습니다.",
        link: {
          kind: "ledger_record_date",
          params: { date: "2026-06-03" },
        },
        source: null,
      }),
    );
  });

  it("수정 알림은 작업 전 기록이 공용이었던 경우에만 만든다", async () => {
    const supabase = createLedgerNotificationSupabaseMock();

    await notifyLedgerEntryUpdated(supabase as never, {
      actorId: "owner-1",
      previousEntry: sharedEntry,
      updatedEntry: { ...sharedEntry, title: "이마트 트레이더스" },
    });

    expect(createUserNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ledger_record_changed",
        title: "공용 가계부 기록이 수정되었습니다",
        body: '홍길동님이 "이마트 장보기" 기록을 수정했습니다.',
        link: {
          kind: "ledger_record_detail",
          params: { entryId: "00000000-0000-4000-8000-000000000101" },
        },
      }),
    );

    createUserNotificationMock.mockClear();

    await notifyLedgerEntryUpdated(supabase as never, {
      actorId: "owner-1",
      previousEntry: { ...sharedEntry, is_shared: false },
      updatedEntry: sharedEntry,
    });

    expect(createUserNotificationMock).not.toHaveBeenCalled();
  });

  it("삭제 알림은 삭제 전 기록 날짜로 이동한다", async () => {
    const supabase = createLedgerNotificationSupabaseMock();

    await notifyLedgerEntryDeleted(supabase as never, {
      actorId: "owner-1",
      entry: sharedEntry,
    });

    expect(createUserNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ledger_record_changed",
        title: "공용 가계부 기록이 삭제되었습니다",
        body: '홍길동님이 "이마트 장보기" 기록을 삭제했습니다.',
        link: {
          kind: "ledger_record_detail",
          params: { entryId: "00000000-0000-4000-8000-000000000101" },
        },
        source: {
          type: "ledger_entry",
          id: "00000000-0000-4000-8000-000000000101",
        },
      }),
    );
  });

  it("알림 생성 실패는 원본 작업으로 전파하지 않는다", async () => {
    const supabase = createLedgerNotificationSupabaseMock();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    createUserNotificationMock.mockRejectedValueOnce(
      new Error("notification insert failed"),
    );

    await expect(
      notifyLedgerEntryCreated(supabase as never, {
        actorId: "owner-1",
        householdId: "household-1",
        entry: sharedEntry,
      }),
    ).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Ledger notification creation error (created):",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
