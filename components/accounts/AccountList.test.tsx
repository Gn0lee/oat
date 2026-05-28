import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AccountWithOwner } from "@/lib/api/account";
import { AccountList } from "./AccountList";

const mocks = vi.hoisted(() => ({
  accounts: [] as AccountWithOwner[],
  mutateAsync: vi.fn(),
}));

vi.mock("@/hooks/use-accounts", () => ({
  useAccounts: () => ({ data: mocks.accounts, isLoading: false, error: null }),
  useUpdateAccount: () => ({ mutateAsync: mocks.mutateAsync }),
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
  accountNumber: "123-456",
  accountType: "isa",
  category: "investment",
  balance: null,
  balanceUpdatedAt: null,
  isDefault: true,
  memo: null,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

describe("AccountList", () => {
  it("renders accounts as grouped collection cards instead of a table", () => {
    mocks.accounts = [account];

    render(<AccountList />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("투자 계좌")).toBeInTheDocument();
    expect(screen.getByText("NH ISA")).toBeInTheDocument();
    expect(screen.getByText("NH투자증권")).toBeInTheDocument();
    expect(screen.getByText("ISA")).toBeInTheDocument();
    expect(screen.getByText("123-456")).toBeInTheDocument();
  });
});
