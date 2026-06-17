import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HouseholdMemberInfo } from "@/lib/api/household";
import type { Invitation } from "@/types";
import { MembersTable } from "./MembersTable";

const members: HouseholdMemberInfo[] = [
  {
    userId: "user-1",
    name: "진호",
    email: "jinho@example.com",
    role: "owner",
    joinedAt: "2026-05-01T00:00:00.000Z",
  },
];

const invitations: Invitation[] = [
  {
    id: "invite-1",
    household_id: "household-1",
    created_by: "user-1",
    email: "pending@example.com",
    status: "pending",
    expires_at: "2099-05-01T00:00:00.000Z",
    created_at: "2026-05-01T00:00:00.000Z",
  },
];

describe("MembersTable", () => {
  it("renders members and pending invitations as people lists instead of a table", () => {
    render(
      <MembersTable
        members={members}
        invitations={invitations}
        currentUserId="user-1"
        isOwner
      />,
    );

    // 1. No role="table"
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    // 2. Members and pending invitations render
    expect(screen.getByText("진호")).toBeInTheDocument();
    expect(screen.getByText("jinho@example.com")).toBeInTheDocument();
    expect(screen.getByText("관리자")).toBeInTheDocument();
    expect(screen.getByText("대기 중 초대")).toBeInTheDocument();
    expect(screen.getByText("pending@example.com")).toBeInTheDocument();

    // 3. Member and invitation sections both render as list/grouped row surfaces.
    // We expect two GroupedLists (one for members, one for invitations).
    const lists = screen.getAllByTestId("grouped-list");
    expect(lists.length).toBe(2);

    // 4. Owner cancel invitation button has accessible name "초대 취소"
    const cancelBtn = screen.getByRole("button", { name: "초대 취소" });
    expect(cancelBtn).toBeInTheDocument();
  });
});
