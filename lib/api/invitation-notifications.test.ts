import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUserNotification } from "@/lib/api/notifications";
import { notifyInvitationAccepted } from "./invitation-notifications";

vi.mock("@/lib/api/notifications", () => ({
  createUserNotification: vi.fn().mockResolvedValue({ id: "notification-1" }),
}));

const createUserNotificationMock = vi.mocked(createUserNotification);

function createInvitationNotificationSupabaseMock() {
  const householdMembersBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockResolvedValue({
      data: [{ user_id: "owner-1" }, { user_id: "member-1" }],
      error: null,
    }),
  };
  const profilesBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { name: "우니", email: "woonie@example.com" },
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

describe("invitation notification helpers", () => {
  beforeEach(() => {
    createUserNotificationMock.mockClear();
  });

  it("초대 수락 시 신규 합류자를 제외한 기존 구성원에게 알림을 만든다", async () => {
    const supabase = createInvitationNotificationSupabaseMock();

    await notifyInvitationAccepted(supabase as never, {
      invitationId: "00000000-0000-4000-8000-000000000301",
      householdId: "household-1",
      acceptedUserId: "accepted-user-1",
      invitedEmail: "fallback@example.com",
    });

    expect(supabase.from).toHaveBeenCalledWith("household_members");
    expect(supabase.householdMembersBuilder.neq).toHaveBeenCalledWith(
      "user_id",
      "accepted-user-1",
    );
    expect(createUserNotificationMock).toHaveBeenCalledTimes(2);
    expect(createUserNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "owner-1",
        householdId: "household-1",
        type: "invitation_accepted",
        title: "새 구성원이 합류했습니다",
        body: "우니님이 가구에 합류했습니다.",
        link: { kind: "household_settings" },
        source: {
          type: "invitation",
          id: "00000000-0000-4000-8000-000000000301",
        },
        dedupeKey: "invitation_accepted:00000000-0000-4000-8000-000000000301",
      }),
    );
  });

  it("프로필 이름이 없으면 초대 이메일을 알림 문구 fallback으로 사용한다", async () => {
    const supabase = createInvitationNotificationSupabaseMock();
    supabase.profilesBuilder.maybeSingle.mockResolvedValueOnce({
      data: { name: "", email: "profile@example.com" },
      error: null,
    });

    await notifyInvitationAccepted(supabase as never, {
      invitationId: "00000000-0000-4000-8000-000000000301",
      householdId: "household-1",
      acceptedUserId: "accepted-user-1",
      invitedEmail: "fallback@example.com",
    });

    expect(createUserNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "fallback@example.com님이 가구에 합류했습니다.",
      }),
    );
  });

  it("알림 생성 실패는 원본 초대 수락으로 전파하지 않는다", async () => {
    const supabase = createInvitationNotificationSupabaseMock();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    createUserNotificationMock.mockRejectedValueOnce(
      new Error("notification insert failed"),
    );

    await expect(
      notifyInvitationAccepted(supabase as never, {
        invitationId: "00000000-0000-4000-8000-000000000301",
        householdId: "household-1",
        acceptedUserId: "accepted-user-1",
        invitedEmail: "fallback@example.com",
      }),
    ).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Invitation accepted notification creation error:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
