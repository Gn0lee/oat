import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Invitation } from "@/types";
import { APIError } from "./error";
import { acceptInvitation } from "./invitation";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const createAdminClientMock = vi.mocked(createAdminClient);

const invitation = {
  id: "00000000-0000-4000-8000-000000000301",
  household_id: "household-1",
  created_by: "owner-1",
  email: "member@example.com",
  status: "pending",
  expires_at: "2026-06-10T00:00:00.000Z",
  created_at: "2026-06-01T00:00:00.000Z",
} as Invitation;

function createAcceptInvitationAdminMock(options: {
  existingMembership: { household_id: string } | null;
}) {
  const membershipSelectBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options.existingMembership,
      error: null,
    }),
  };
  const membershipInsertBuilder = {
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
  const invitationUpdateBuilder = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  };

  const householdMembersFrom = vi
    .fn()
    .mockReturnValueOnce(membershipSelectBuilder)
    .mockReturnValue(membershipInsertBuilder);

  const admin = {
    from: vi.fn((table: string) => {
      if (table === "household_members") return householdMembersFrom();
      if (table === "invitations") return invitationUpdateBuilder;
      throw new Error(`Unexpected table: ${table}`);
    }),
    membershipSelectBuilder,
    membershipInsertBuilder,
    invitationUpdateBuilder,
  };

  return admin;
}

describe("acceptInvitation", () => {
  beforeEach(() => {
    createAdminClientMock.mockReset();
  });

  it("이미 같은 가구 구성원이면 멤버 추가 없이 invitation을 accepted로 정리한다", async () => {
    const admin = createAcceptInvitationAdminMock({
      existingMembership: { household_id: "household-1" },
    });
    createAdminClientMock.mockReturnValue(admin as never);

    await expect(
      acceptInvitation({} as never, invitation, "member-1"),
    ).resolves.toBeUndefined();

    expect(admin.membershipInsertBuilder.insert).not.toHaveBeenCalled();
    expect(admin.invitationUpdateBuilder.update).toHaveBeenCalledWith({
      status: "accepted",
    });
    expect(admin.invitationUpdateBuilder.eq).toHaveBeenCalledWith(
      "id",
      invitation.id,
    );
  });

  it("다른 가구 구성원은 초대 가구로 자동 이동하지 않는다", async () => {
    const admin = createAcceptInvitationAdminMock({
      existingMembership: { household_id: "other-household" },
    });
    createAdminClientMock.mockReturnValue(admin as never);

    await expect(
      acceptInvitation({} as never, invitation, "member-1"),
    ).rejects.toMatchObject(
      new APIError(
        "INVITATION_ALREADY_IN_OTHER_HOUSEHOLD",
        "이미 다른 가구에 속해있습니다.",
        409,
      ),
    );

    expect(admin.membershipInsertBuilder.insert).not.toHaveBeenCalled();
    expect(admin.invitationUpdateBuilder.update).not.toHaveBeenCalled();
  });
});
