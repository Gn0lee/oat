import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useLedgerEntries } from "@/hooks/use-ledger-entries";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { LedgerRecordsClient } from "./LedgerRecordsClient";

vi.mock("next/navigation", () => ({
  usePathname: () => "/ledger/records",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("date=2026-06-16"),
}));

vi.mock("@/hooks/use-ledger-entries", () => ({
  useLedgerEntries: vi.fn(),
}));

vi.mock("@/components/ledger/CategoryIcon", () => ({
  CategoryIcon: ({ iconName }: { iconName: string | null }) => (
    <span data-icon-name={iconName ?? "fallback"} />
  ),
}));

const mockEntries: LedgerEntryWithDetails[] = [
  {
    id: "entry-1",
    householdId: "household-1",
    ownerId: "owner-1",
    ownerName: "홍길동",
    type: "expense",
    amount: 1250000, // Large amount to check no compaction on row
    title: "가계부등록기록",
    categoryId: "cat-1",
    categoryName: "식비",
    categoryIcon: "Coffee",
    fromAccountId: null,
    fromAccountName: null,
    fromPaymentMethodId: "pay-1",
    fromPaymentMethodName: "신용카드",
    toAccountId: null,
    toAccountName: null,
    toPaymentMethodId: null,
    toPaymentMethodName: null,
    isShared: true,
    memo: "메모",
    transactedAt: "2026-06-16T00:00:00.000Z",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  },
];

describe("LedgerRecordsClient", () => {
  it("restores selected date, shows scope switch, summary metrics, links row and add button with date query", () => {
    // mock useLedgerEntries to return data only for current month (June)
    vi.mocked(useLedgerEntries).mockImplementation((params) => {
      if (params?.month === 6) {
        return {
          data: mockEntries,
          isLoading: false,
        } as unknown as ReturnType<typeof useLedgerEntries>;
      }
      return {
        data: [],
        isLoading: false,
      } as unknown as ReturnType<typeof useLedgerEntries>;
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LedgerRecordsClient initialDate="2026-06-16" />
      </QueryClientProvider>,
    );

    // 1. scope switch 검증 (공용 / 개인)
    expect(screen.getByText("공용")).toBeInTheDocument();
    expect(screen.getByText("개인")).toBeInTheDocument();

    // 2. summary metrics (입금, 지출, 잔액 라벨 확인)
    expect(screen.getByText("입금")).toBeInTheDocument();
    expect(screen.getByText("지출")).toBeInTheDocument();
    expect(screen.getByText("잔액")).toBeInTheDocument();

    // 3. selected date list links row correctly
    expect(
      screen.getByRole("link", { name: /가계부등록기록/ }),
    ).toHaveAttribute(
      "href",
      "/ledger/records/entry-1?from=records&date=2026-06-16",
    );

    // 4. add button href remains correctly formatted with date query
    expect(screen.getByRole("link", { name: /가계부 등록/ })).toHaveAttribute(
      "href",
      "/ledger/records/new/daily?date=2026-06-16",
    );
  });
});
