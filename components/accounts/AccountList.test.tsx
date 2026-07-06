import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AccountWithOwner } from "@/lib/api/account";
import { AccountList } from "./AccountList";

const mocks = vi.hoisted(() => ({
  accounts: [] as AccountWithOwner[],
}));

vi.mock("@/hooks/use-accounts", () => ({
  useAccounts: () => ({ data: mocks.accounts, isLoading: false, error: null }),
}));

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUserId: () => ({ userId: "user-1", isLoading: false }),
}));

vi.mock("./AccountFormDialog", () => ({
  AccountFormDialog: () => null,
}));

vi.mock("./AccountDeleteDialog", () => ({
  AccountDeleteDialog: () => null,
}));

const account: AccountWithOwner = {
  id: "account-1",
  householdId: "household-1",
  ownerId: "user-1",
  ownerName: "진호",
  name: "NH ISA",
  broker: "NH투자증권",
  lastFour: "1234",
  accountType: "isa",
  category: "investment",
  balance: null,
  isHouseholdUsable: false,
  balanceUpdatedAt: null,
  memo: null,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

const bankAccount: AccountWithOwner = {
  id: "account-2",
  householdId: "household-1",
  ownerId: "user-1",
  ownerName: "진호",
  name: "카카오뱅크",
  broker: "카카오뱅크",
  lastFour: "5678",
  accountType: "checking",
  category: "bank",
  balance: null,
  isHouseholdUsable: false,
  balanceUpdatedAt: null,
  memo: null,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

describe("AccountList", () => {
  it("renders grouped account rows with bank/investment grouping", () => {
    mocks.accounts = [
      {
        ...account,
        name: "생활비와 공과금용 공동 주거래 계좌 아주아주아주긴계좌이름",
        balance: 1234567890,
      },
    ];

    const { container } = render(<AccountList />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("투자 계좌")).toBeInTheDocument();

    const nameElement = screen.getByText(
      "생활비와 공과금용 공동 주거래 계좌 아주아주아주긴계좌이름",
    );
    expect(nameElement).toBeInTheDocument();
    expect(nameElement).toHaveClass("line-clamp-2");

    expect(screen.getByText("1,234,567,890원")).toBeInTheDocument();
    expect(screen.getByText(/NH투자증권/)).toBeInTheDocument();
    expect(screen.getByText("ISA")).toBeInTheDocument();
    expect(screen.getByText(/끝 1234/)).toBeInTheDocument();

    // Assert no credit card icon is rendered
    expect(
      container.querySelector(".lucide-credit-card"),
    ).not.toBeInTheDocument();
  });

  it("renders a single section header for unfiltered list with both bank and investment subgroups", () => {
    mocks.accounts = [bankAccount, account];
    const action = <button type="button">계좌 추가</button>;

    render(<AccountList title="계좌" action={action} />);

    // Verify there is only one "계좌" heading and one "계좌 추가" button
    expect(screen.getAllByRole("heading", { name: "계좌" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "계좌 추가" })).toHaveLength(
      1,
    );

    // Verify both subgroup headings are visible
    expect(screen.getByText("은행 계좌")).toBeInTheDocument();
    expect(screen.getByText("투자 계좌")).toBeInTheDocument();
  });

  it("renders screen-state when empty", () => {
    mocks.accounts = [];

    render(<AccountList />);

    expect(screen.getByTestId("screen-state")).toBeInTheDocument();
    expect(screen.getByText("등록된 계좌가 없습니다.")).toBeInTheDocument();
  });
});
