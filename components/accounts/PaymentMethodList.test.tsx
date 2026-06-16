import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PaymentMethodWithDetails } from "@/lib/api/payment-method";
import { PaymentMethodList } from "./PaymentMethodList";

const mocks = vi.hoisted(() => ({
  paymentMethods: [] as PaymentMethodWithDetails[],
}));

vi.mock("@/hooks/use-payment-methods", () => ({
  usePaymentMethods: () => ({
    data: mocks.paymentMethods,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUserId: () => ({ userId: "user-1", isLoading: false }),
}));

vi.mock("./PaymentMethodFormDialog", () => ({
  PaymentMethodFormDialog: () => null,
}));

vi.mock("./PaymentMethodDeleteDialog", () => ({
  PaymentMethodDeleteDialog: () => null,
}));

const paymentMethod: PaymentMethodWithDetails = {
  id: "payment-1",
  householdId: "household-1",
  ownerId: "user-1",
  ownerName: "진호",
  name: "현대카드",
  type: "credit_card",
  linkedAccountId: "account-1",
  linkedAccountName: "생활비 통장",
  issuer: "Hyundai",
  lastFour: "1234",
  paymentDay: 25,
  balance: null,
  balanceUpdatedAt: null,
  memo: null,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

describe("PaymentMethodList", () => {
  it("renders payment methods as grouped rows with details", () => {
    mocks.paymentMethods = [paymentMethod];

    render(<PaymentMethodList />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("현대카드")).toBeInTheDocument();
    expect(screen.getByText("신용카드")).toBeInTheDocument();
    expect(screen.getByText("Hyundai")).toBeInTheDocument();
    expect(screen.getByText("1234")).toBeInTheDocument();
    expect(screen.getByText("생활비 통장")).toBeInTheDocument();
  });

  it("renders screen-state when empty", () => {
    mocks.paymentMethods = [];

    render(<PaymentMethodList />);

    expect(screen.getByTestId("screen-state")).toBeInTheDocument();
    expect(screen.getByText("등록된 결제수단이 없습니다.")).toBeInTheDocument();
  });
});
