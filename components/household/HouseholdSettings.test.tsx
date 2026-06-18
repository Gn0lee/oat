import { fireEvent, render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { useUpdateHouseholdName } from "@/hooks/use-household";
import { HouseholdSettings } from "./HouseholdSettings";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/hooks/use-household", () => ({
  useUpdateHouseholdName: vi.fn(),
}));

describe("HouseholdSettings", () => {
  it("owner view: renders household name with an edit button and toggles editing form", () => {
    const mockRouter = { refresh: vi.fn() };
    vi.mocked(useRouter).mockReturnValue(mockRouter as any);

    const mockMutate = vi.fn();
    vi.mocked(useUpdateHouseholdName).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any);

    render(
      <HouseholdSettings
        householdId="household-1"
        householdName="우리 집"
        isOwner={true}
      />,
    );

    // 1. Title is rendered
    expect(screen.getByText("가구 설정")).toBeInTheDocument();

    // 2. Household name and edit button (Pencil icon) are visible
    expect(screen.getByText("우리 집")).toBeInTheDocument();

    // We expect GroupedList is used (fail check)
    const groupedList = screen.getByTestId("grouped-list");
    expect(groupedList).toBeInTheDocument();

    const editBtn = screen.getByRole("button"); // edit button should exist
    expect(editBtn).toBeInTheDocument();

    // 3. Clicking edit reveals input, save (Check), and cancel (X) buttons
    fireEvent.click(editBtn);

    const input = screen.getByPlaceholderText("가구 이름");
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe("우리 집");

    // Inside editing mode, there should be save and cancel buttons
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(2); // save and cancel buttons
  });

  it("non-owner view: does not show edit button and displays help message", () => {
    const mockRouter = { refresh: vi.fn() };
    vi.mocked(useRouter).mockReturnValue(mockRouter as any);

    vi.mocked(useUpdateHouseholdName).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    render(
      <HouseholdSettings
        householdId="household-1"
        householdName="우리 집"
        isOwner={false}
      />,
    );

    // No edit button
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    // Shows non-owner text
    expect(
      screen.getByText("가구 이름은 관리자만 변경할 수 있습니다."),
    ).toBeInTheDocument();
  });
});
