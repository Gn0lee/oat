import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MultiTransactionForm } from "@/components/transactions/MultiTransactionForm";
import { LedgerEntryComposer } from "./LedgerEntryComposer";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("nuqs", () => ({
  parseAsInteger: {},
  useQueryState: () => [0, vi.fn()],
}));
vi.mock("@/hooks/use-media-query", () => ({ useMediaQuery: () => false }));
vi.mock("@/hooks/use-ledger-entries", () => ({
  useCreateBatchLedgerEntries: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));
vi.mock("@/hooks/use-transaction", () => ({
  useCreateBatchTransactions: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));
vi.mock("./ComposerListStep", () => ({ ComposerListStep: () => null }));
vi.mock("./ComposerFormStep", () => ({ ComposerFormStep: () => null }));
vi.mock("@/components/transactions/StockComposerListStep", () => ({
  StockComposerListStep: () => null,
}));
vi.mock("@/components/transactions/StockComposerFormStep", () => ({
  StockComposerFormStep: () => null,
}));

afterEach(() => vi.clearAllMocks());

describe("composer mobile drawers", () => {
  it("announces the ledger edit drawer", async () => {
    render(<LedgerEntryComposer mode="daily" defaultDate="2026-09-17" />);
    expect(
      await screen.findByRole("dialog", { name: "가계부 내역 편집" }),
    ).toBeInTheDocument();
  });

  it("announces the stock edit drawer", async () => {
    render(
      <MultiTransactionForm
        mode="daily"
        defaultDate="2026-09-17"
        defaultAccountId="account-1"
        ownerId="user-1"
      />,
    );
    expect(
      await screen.findByRole("dialog", { name: "주식 거래 편집" }),
    ).toBeInTheDocument();
  });
});
