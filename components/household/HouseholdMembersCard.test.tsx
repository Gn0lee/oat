import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useCancelInvitation,
  useInvitations,
  useSendInvitation,
} from "@/hooks/use-invitation";
import type { HouseholdMemberInfo } from "@/lib/api/household";
import { HouseholdMembersCard } from "./HouseholdMembersCard";

vi.mock("@/hooks/use-invitation", () => ({
  useInvitations: vi.fn(),
  useSendInvitation: vi.fn(),
  useCancelInvitation: vi.fn(),
}));

const mockMembers: HouseholdMemberInfo[] = [
  {
    userId: "user-1",
    name: "진호",
    email: "jinho@example.com",
    role: "owner",
    joinedAt: "2026-05-01T00:00:00.000Z",
  },
];

describe("HouseholdMembersCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("owner under member limit: shows invite button, clicking it renders InviteFormInline", () => {
    vi.mocked(useInvitations).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useInvitations>);

    const mockSendMutate = vi.fn();
    vi.mocked(useSendInvitation).mockReturnValue({
      mutate: mockSendMutate,
      reset: vi.fn(),
      isPending: false,
      error: null,
      isSuccess: false,
    } as unknown as ReturnType<typeof useSendInvitation>);

    vi.mocked(useCancelInvitation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCancelInvitation>);

    render(
      <HouseholdMembersCard
        members={mockMembers}
        currentUserId="user-1"
        isOwner={true}
      />,
    );

    // 1. Render GroupedList or layout primitives (checking data-testid)
    const groupedList = screen.getByTestId("grouped-list");
    expect(groupedList).toBeInTheDocument();

    // 2. Invite button is visible
    const inviteBtn = screen.getByRole("button", { name: "초대" });
    expect(inviteBtn).toBeInTheDocument();

    // 3. Invite form is hidden initially
    expect(
      screen.queryByPlaceholderText("초대할 이메일 주소"),
    ).not.toBeInTheDocument();

    // 4. Click invite button to show form
    fireEvent.click(inviteBtn);
    const emailInput = screen.getByPlaceholderText("초대할 이메일 주소");
    expect(emailInput).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "취소" });
    expect(cancelBtn).toBeInTheDocument();
  });

  it("non-owner: does not show invite button", () => {
    vi.mocked(useInvitations).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useInvitations>);

    vi.mocked(useSendInvitation).mockReturnValue({
      mutate: vi.fn(),
      reset: vi.fn(),
      isPending: false,
      error: null,
      isSuccess: false,
    } as unknown as ReturnType<typeof useSendInvitation>);

    vi.mocked(useCancelInvitation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCancelInvitation>);

    render(
      <HouseholdMembersCard
        members={mockMembers}
        currentUserId="user-1"
        isOwner={false}
      />,
    );

    // Invite button should not exist
    expect(
      screen.queryByRole("button", { name: "초대" }),
    ).not.toBeInTheDocument();
  });
});
