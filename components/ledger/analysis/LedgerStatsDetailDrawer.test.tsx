import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useLedgerStatsDetail } from "@/hooks/use-ledger-stats";
import { LedgerStatsDetailDrawer } from "./LedgerStatsDetailDrawer";

vi.mock("@/hooks/use-ledger-stats", () => ({
  useLedgerStatsDetail: vi.fn(),
}));

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DrawerFooter: ({ children }: { children: ReactNode }) => (
    <footer>{children}</footer>
  ),
  DrawerHeader: ({ children }: { children: ReactNode }) => (
    <header>{children}</header>
  ),
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

describe("LedgerStatsDetailDrawer", () => {
  it("알고 있는 기록 건수만큼 loading skeleton을 표시한다", () => {
    vi.mocked(useLedgerStatsDetail).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useLedgerStatsDetail>);

    const { container } = render(
      <LedgerStatsDetailDrawer
        open
        title="식비 기록"
        params={{ kind: "category", scope: "shared" }}
        expectedCount={2}
        onOpenChange={() => undefined}
      />,
    );

    expect(container.querySelectorAll("[data-slot='skeleton']")).toHaveLength(
      2,
    );
  });
});
