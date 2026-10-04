import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LedgerEntryComposer } from "./LedgerEntryComposer";

const routerPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn() }),
  usePathname: () => "/ledger/records/new/daily",
  useSearchParams: () =>
    new URLSearchParams(
      "date=2026-06-05&book=11111111-1111-4111-8111-111111111111",
    ),
}));
vi.mock("nuqs", () => ({
  parseAsInteger: {},
  useQueryState: () => [null, vi.fn()],
}));
vi.mock("@/hooks/use-media-query", () => ({ useMediaQuery: () => false }));
vi.mock("@/hooks/use-ledger-books", () => ({
  useLedgerBooks: () => ({
    data: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "공용 생활비",
        visibility: "shared",
        isDefault: true,
        archivedAt: null,
      },
    ],
  }),
}));
vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUserId: () => ({ userId: "user-1" }),
}));
vi.mock("@/hooks/use-categories", () => ({
  useCategories: () => ({ data: [] }),
}));
vi.mock("@/hooks/use-accounts", () => ({ useAccounts: () => ({ data: [] }) }));
vi.mock("@/hooks/use-payment-methods", () => ({
  usePaymentMethods: () => ({ data: [] }),
}));
vi.mock("@/hooks/use-ledger-entries", () => ({
  useCreateBatchLedgerEntries: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

function renderComposer() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <LedgerEntryComposer
        mode="daily"
        defaultDate="2026-06-05"
        sourceBookId="11111111-1111-4111-8111-111111111111"
      />
    </QueryClientProvider>,
  );
}

describe("mobile ledger composer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("starts with one content-and-amount row and proceeds to the one-entry details screen", async () => {
    renderComposer();
    expect(await screen.findByLabelText("내용 1")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("내용 1"), {
      target: { value: "점심" },
    });
    fireEvent.change(screen.getByLabelText("금액 1"), {
      target: { value: "12000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(
      await screen.findByRole("heading", { name: "나머지 정보" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("점심").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("12,000원")).toBeInTheDocument();
    expect(screen.queryByLabelText(/태그/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/공개범위/)).not.toBeInTheDocument();
  });

  it("focuses and identifies the missing first basics field", async () => {
    renderComposer();
    const next = await screen.findByRole("button", { name: "다음" });
    fireEvent.click(next);
    const title = await screen.findByLabelText("내용 1");
    await waitFor(() => expect(title).toHaveFocus());
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("내용을 입력해주세요.")).toBeInTheDocument();
  });

  it("keeps stable rows through add and remove, then selects the one-entry path from the remaining count", async () => {
    renderComposer();
    fireEvent.change(await screen.findByLabelText("내용 1"), {
      target: { value: "첫째" },
    });
    fireEvent.change(screen.getByLabelText("금액 1"), {
      target: { value: "1000" },
    });
    const mobileStep = () =>
      within(
        document.querySelector<HTMLElement>(
          '[data-ssgoi-transition^="ledger-composer-"]',
        )!,
      );
    fireEvent.click(mobileStep().getByRole("button", { name: "내역 추가" }));
    fireEvent.change(screen.getByLabelText("내용 2"), {
      target: { value: "둘째" },
    });
    fireEvent.change(screen.getByLabelText("금액 2"), {
      target: { value: "2000" },
    });
    fireEvent.click(
      mobileStep().getByRole("button", { name: "1번째 기록 삭제" }),
    );
    expect(screen.getByLabelText("내용 1")).toHaveValue("둘째");
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(
      await screen.findByRole("heading", { name: "나머지 정보" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("둘째").length).toBeGreaterThan(0);
  });

  it("keeps the draft and restores focus when the user cancels a close", async () => {
    renderComposer();
    const title = await screen.findByLabelText("내용 1");
    fireEvent.change(title, { target: { value: "남길 기록" } });
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    window.dispatchEvent(
      new CustomEvent("oat:ledger-composer-close", { detail: { trigger } }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "계속 입력" }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.getByLabelText("내용 1")).toHaveValue("남길 기록");
    trigger.remove();
  });

  it("guards an internal app link and preserves its destination for discard", async () => {
    renderComposer();
    fireEvent.change(await screen.findByLabelText("내용 1"), {
      target: { value: "작성 중" },
    });
    const assetsLink = document.createElement("a");
    assetsLink.href = "/assets";
    document.body.append(assetsLink);
    fireEvent.click(assetsLink);
    fireEvent.click(await screen.findByRole("button", { name: "내용 버리기" }));
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/assets"));
    assetsLink.remove();
  });
});
