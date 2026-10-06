import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LedgerEntryComposer } from "./LedgerEntryComposer";

const routerPush = vi.fn();
const routerReplace = vi.fn();
const router = { push: routerPush, replace: routerReplace };
const media = vi.hoisted(() => ({ desktop: false, tablet: false }));
const { mockBooks, createBatch, createCategory } = vi.hoisted(() => ({
  mockBooks: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "공용 생활비",
      visibility: "shared",
      isDefault: true,
      archivedAt: null as string | null,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "개인 장부",
      visibility: "personal",
      isDefault: false,
      archivedAt: null as string | null,
    },
  ],
  createBatch: vi.fn(),
  createCategory: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
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
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: (query: string) =>
    query === "(min-width: 768px)" ? media.desktop : media.tablet,
}));
vi.mock("@/hooks/use-ledger-books", async () => {
  const { useQuery } = await import("@tanstack/react-query");
  return {
    useLedgerBooks: () =>
      useQuery({
        queryKey: ["ledgerBooks"],
        queryFn: async () => [...mockBooks],
      }),
  };
});
vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUserId: () => ({ userId: "user-1" }),
}));
vi.mock("@/hooks/use-categories", () => ({
  useCreateCategory: () => ({ mutateAsync: createCategory, isPending: false }),
  useCategories: (type: string) => ({
    data:
      type === "income"
        ? [{ id: "income-category", name: "급여", type: "income" }]
        : [
            { id: "expense-category", name: "식비", type: "expense" },
            { id: "transport-category", name: "교통비", type: "expense" },
          ],
  }),
}));
vi.mock("@/hooks/use-accounts", () => ({
  useAccounts: () => ({
    data: [
      {
        id: "account-1",
        name: "주거래 통장",
        ownerId: "user-1",
        ownerName: "작성자",
        broker: null,
        lastFour: null,
        accountType: "checking",
        category: "bank",
        isHouseholdUsable: true,
      },
    ],
  }),
}));
vi.mock("@/hooks/use-payment-methods", () => ({
  usePaymentMethods: () => ({ data: [] }),
}));
vi.mock("@/hooks/use-ledger-entries", () => ({
  useCreateBatchLedgerEntries: () => ({
    mutateAsync: createBatch,
    isPending: false,
  }),
}));
vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
  }) => (
    <div role="dialog" hidden={!open}>
      {children}
      {open && (
        <button type="button" onClick={() => onOpenChange(false)}>
          Dismiss drawer
        </button>
      )}
    </div>
  ),
  DrawerContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DrawerDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

function renderComposer(sourceBookId = "11111111-1111-4111-8111-111111111111") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <LedgerEntryComposer
        mode="daily"
        defaultDate="2026-06-05"
        sourceBookId={sourceBookId}
      />
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

describe("mobile ledger composer", () => {
  beforeEach(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    Element.prototype.scrollIntoView = vi.fn();
  });
  beforeEach(() => {
    createBatch.mockReset();
    createCategory.mockReset();
    routerPush.mockReset();
    routerReplace.mockReset();
    mockBooks[0]!.archivedAt = null;
    media.desktop = false;
    media.tablet = false;
    window.history.replaceState(null, "", window.location.href);
  });

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
      await screen.findByRole("heading", { name: "상세 입력" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("점심").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("12,000원")).toBeInTheDocument();
    expect(screen.queryByLabelText(/태그/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/공개범위/)).not.toBeInTheDocument();
  });

  it("returns from single-entry details to Basics through header back with values retained", async () => {
    renderComposer();
    fireEvent.change(await screen.findByLabelText("내용 1"), {
      target: { value: "헤더 뒤로" },
    });
    fireEvent.change(screen.getByLabelText("금액 1"), {
      target: { value: "4200" },
    });
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(
      await screen.findByRole("heading", { name: "상세 입력" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "이전" }),
    ).not.toBeInTheDocument();
    fireEvent(window, new CustomEvent("oat:ledger-composer-back"));
    expect(await screen.findByLabelText("내용 1")).toHaveValue("헤더 뒤로");
    expect(screen.getByLabelText("금액 1")).toHaveValue(4200);
  });

  it("sizes the first mobile screen to its content instead of the viewport", async () => {
    const { container } = renderComposer();
    const basics = (await screen.findByLabelText("내용 1")).closest("section");

    expect(basics?.className).not.toMatch(/min-h-/);
    expect(container.querySelector('[class*="min-h-screen"]')).toBeNull();
    expect(container.querySelector('[class*="100dvh"]')).toBeNull();
  });

  it("leaves the keyboard down when a mobile picker drawer opens", async () => {
    renderComposer();
    fireEvent.change(await screen.findByLabelText("내용 1"), {
      target: { value: "점심" },
    });
    fireEvent.change(screen.getByLabelText("금액 1"), {
      target: { value: "12000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    const categoryTrigger = await screen.findByRole("combobox", {
      name: "카테고리 1",
    });
    fireEvent.click(categoryTrigger);
    const categorySearch =
      await screen.findByPlaceholderText("카테고리 이름 검색");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(categorySearch).not.toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss drawer" }));
    await waitFor(() => expect(categoryTrigger).toHaveFocus());

    const sourceTrigger = screen.getByRole("combobox", { name: "결제 방법 1" });
    fireEvent.click(sourceTrigger);
    const sourceSearch = await screen.findByPlaceholderText(
      "이름, 기관, 소유자 검색",
    );
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(sourceSearch).not.toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss drawer" }));
    await waitFor(() => expect(sourceTrigger).toHaveFocus());
  });

  it("focuses and identifies the missing first basics field", async () => {
    renderComposer();
    const next = await screen.findByRole("button", { name: "다음" });
    fireEvent.click(next);
    const title = await screen.findByLabelText("내용 1");
    await waitFor(() => expect(title).toHaveFocus());
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("내용을 입력해 주세요.")).toBeInTheDocument();
  });

  it("focuses row 2 title and amount errors and returns valid edits to Review", async () => {
    renderComposer();
    fireEvent.change(await screen.findByLabelText("내용 1"), {
      target: { value: "첫째" },
    });
    fireEvent.change(screen.getByLabelText("금액 1"), {
      target: { value: "1000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "기록 추가" }));
    fireEvent.change(screen.getByLabelText("내용 2"), {
      target: { value: "둘째" },
    });
    fireEvent.change(screen.getByLabelText("금액 2"), {
      target: { value: "2000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    for (const row of [1, 2]) {
      fireEvent.click(
        await screen.findByRole("combobox", { name: `카테고리 ${row}` }),
      );
      fireEvent.click(await screen.findByRole("option", { name: "식비" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(await screen.findByRole("button", { name: "다음" }));
    fireEvent.click(await screen.findByRole("button", { name: "입력 확인" }));
    expect(
      await screen.findByRole("heading", { name: "입력 확인" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "기록 2 내용 수정: 둘째" }),
    );
    const title = await screen.findByLabelText("내용 2");
    fireEvent.change(title, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "내용을 입력해 주세요.",
    );
    fireEvent.change(title, { target: { value: "둘째 수정" } });
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(
      await screen.findByRole("heading", { name: "입력 확인" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "기록 1 내용 수정: 첫째" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "기록 2 내용 수정: 둘째 수정" }),
      ).toHaveFocus(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "기록 2 금액 수정: 2,000원" }),
    );
    const amount = await screen.findByLabelText("금액 2");
    fireEvent.change(amount, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() => expect(amount).toHaveFocus());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "금액을 입력해 주세요.",
    );
    fireEvent.change(amount, { target: { value: "2500" } });
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "기록 2 금액 수정: 2,500원" }),
      ).toHaveFocus(),
    );
  });

  it("keeps stable rows through add and remove, then selects the one-entry path from the remaining count", async () => {
    renderComposer();
    fireEvent.change(await screen.findByLabelText("내용 1"), {
      target: { value: "첫째" },
    });
    fireEvent.change(screen.getByLabelText("금액 1"), {
      target: { value: "1000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "기록 추가" }));
    fireEvent.change(screen.getByLabelText("내용 2"), {
      target: { value: "둘째" },
    });
    fireEvent.change(screen.getByLabelText("금액 2"), {
      target: { value: "2000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "1번째 기록 삭제" }));
    expect(screen.getByLabelText("내용 1")).toHaveValue("둘째");
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(
      await screen.findByRole("heading", { name: "상세 입력" }),
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

  it("keeps the chosen money source when the current type is clicked again on desktop", async () => {
    media.desktop = true;
    renderComposer();
    fireEvent.click(
      await screen.findByRole("button", { name: /내용을 입력해 주세요/ }),
    );
    const editor = await screen.findByRole("dialog", { name: "기록 수정" });
    fireEvent.click(
      within(editor).getByRole("combobox", { name: "결제 방법 1" }),
    );
    fireEvent.click(
      await screen.findByRole("option", { name: /^주거래 통장/ }),
    );
    expect(
      within(editor).getByRole("combobox", { name: "결제 방법 1" }),
    ).toHaveTextContent("주거래 통장");
    fireEvent.click(within(editor).getByRole("button", { name: "지출" }));
    expect(
      within(editor).getByRole("combobox", { name: "결제 방법 1" }),
    ).toHaveTextContent("주거래 통장");
  });

  describe("history sentinel and post-save exit", () => {
    const bookId = "11111111-1111-4111-8111-111111111111";
    const target = `/ledger/records?book=${bookId}&date=2026-06-05`;
    const sentinelPushes = (spy: { mock: { calls: unknown[][] } }) =>
      spy.mock.calls.filter(([state]) =>
        Object.keys((state ?? {}) as object).some((key) =>
          key.startsWith("ledger-composer-"),
        ),
      );
    const renderStrict = () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      queryClient.setQueryData(["ledgerBooks"], [...mockBooks]);
      const element = () => (
        <StrictMode>
          <QueryClientProvider client={queryClient}>
            <LedgerEntryComposer
              mode="daily"
              defaultDate="2026-06-05"
              sourceBookId={bookId}
            />
          </QueryClientProvider>
        </StrictMode>
      );
      const view = render(element());
      return {
        ...view,
        queryClient,
        rerenderSame: () => view.rerender(element()),
      };
    };

    it("pushes exactly one sentinel per mount across StrictMode, rerender, books refetch and viewport change", async () => {
      const pushState = vi.spyOn(window.history, "pushState");
      const view = renderStrict();
      await screen.findByLabelText("내용 1");
      view.rerenderSame();
      await view.queryClient.invalidateQueries({ queryKey: ["ledgerBooks"] });
      media.desktop = true;
      view.rerenderSame();
      media.desktop = false;
      view.rerenderSame();
      await screen.findByLabelText("내용 1");
      expect(sentinelPushes(pushState)).toHaveLength(1);
      pushState.mockRestore();
    });

    it("replaces to the computed target after a single-entry save", async () => {
      createBatch.mockResolvedValue({ count: 1 });
      renderStrict();
      fireEvent.change(await screen.findByLabelText("내용 1"), {
        target: { value: "점심" },
      });
      fireEvent.change(screen.getByLabelText("금액 1"), {
        target: { value: "8000" },
      });
      fireEvent.click(screen.getByRole("button", { name: "다음" }));
      fireEvent.click(
        await screen.findByRole("combobox", { name: "카테고리 1" }),
      );
      fireEvent.click(await screen.findByRole("option", { name: "식비" }));
      fireEvent.click(await screen.findByRole("button", { name: "저장" }));
      await waitFor(() => expect(routerReplace).toHaveBeenCalledWith(target), {
        timeout: 3000,
      });
    });

    it("replaces to the computed target after a header-back round trip and a multi-entry save", async () => {
      createBatch.mockResolvedValue({ count: 2 });
      renderStrict();
      fireEvent.change(await screen.findByLabelText("내용 1"), {
        target: { value: "첫째" },
      });
      fireEvent.change(screen.getByLabelText("금액 1"), {
        target: { value: "1000" },
      });
      fireEvent.click(screen.getByRole("button", { name: "다음" }));
      expect(
        await screen.findByRole("heading", { name: "상세 입력" }),
      ).toBeInTheDocument();
      fireEvent(window, new CustomEvent("oat:ledger-composer-back"));
      fireEvent.click(await screen.findByRole("button", { name: "기록 추가" }));
      fireEvent.change(screen.getByLabelText("내용 2"), {
        target: { value: "둘째" },
      });
      fireEvent.change(screen.getByLabelText("금액 2"), {
        target: { value: "2000" },
      });
      fireEvent.click(screen.getByRole("button", { name: "다음" }));
      for (const row of [1, 2]) {
        fireEvent.click(
          await screen.findByRole("combobox", { name: `카테고리 ${row}` }),
        );
        fireEvent.click(await screen.findByRole("option", { name: "식비" }));
      }
      fireEvent.click(screen.getByRole("button", { name: "다음" }));
      fireEvent.click(await screen.findByRole("button", { name: "다음" }));
      fireEvent.click(await screen.findByRole("button", { name: "입력 확인" }));
      fireEvent.click(await screen.findByRole("button", { name: "모두 저장" }));
      await waitFor(() => expect(routerReplace).toHaveBeenCalledWith(target), {
        timeout: 3000,
      });
    });
  });

  it("keeps one shared row list when the viewport changes between mobile and desktop", async () => {
    createBatch.mockResolvedValue({ count: 2 });
    const view = renderComposer();
    const switchViewport = (desktop: boolean) => {
      media.desktop = desktop;
      view.rerender(
        <QueryClientProvider client={view.queryClient}>
          <LedgerEntryComposer
            mode="daily"
            defaultDate="2026-06-05"
            sourceBookId="11111111-1111-4111-8111-111111111111"
          />
        </QueryClientProvider>,
      );
    };
    const rowButtons = () =>
      screen.queryAllByRole("button", { name: /번째 기록 삭제/ });
    fireEvent.change(await screen.findByLabelText("내용 1"), {
      target: { value: "첫째" },
    });
    fireEvent.change(screen.getByLabelText("금액 1"), {
      target: { value: "1000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "기록 추가" }));
    fireEvent.change(screen.getByLabelText("내용 2"), {
      target: { value: "둘째" },
    });
    fireEvent.change(screen.getByLabelText("금액 2"), {
      target: { value: "2000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "기록 추가" }));
    fireEvent.change(screen.getByLabelText("내용 3"), {
      target: { value: "셋째" },
    });
    fireEvent.change(screen.getByLabelText("금액 3"), {
      target: { value: "3000" },
    });

    switchViewport(true);
    await waitFor(() => expect(rowButtons()).toHaveLength(3));

    fireEvent.click(screen.getByRole("button", { name: "3번째 기록 삭제" }));
    await waitFor(() => expect(rowButtons()).toHaveLength(2));
    fireEvent.click(screen.getByRole("button", { name: "기록 추가" }));
    expect(
      await screen.findByRole("dialog", { name: "기록 수정" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    switchViewport(false);
    expect(await screen.findByLabelText("내용 1")).toHaveValue("첫째");
    expect(screen.getByLabelText("내용 2")).toHaveValue("둘째");
    expect(screen.getByLabelText("내용 3")).toHaveValue("");
    expect(screen.queryByLabelText("내용 4")).not.toBeInTheDocument();
  });

  it("saves exactly the rows visible in the desktop list", async () => {
    createBatch.mockResolvedValue({ count: 2 });
    media.desktop = true;
    renderComposer();
    const fillEditor = async (row: number, title: string, amount: string) => {
      const editor = await screen.findByRole("dialog", { name: "기록 수정" });
      fireEvent.change(within(editor).getByLabelText("내용"), {
        target: { value: title },
      });
      fireEvent.change(within(editor).getByLabelText("금액 (원)"), {
        target: { value: amount },
      });
      fireEvent.click(
        within(editor).getByRole("combobox", { name: `카테고리 ${row}` }),
      );
      fireEvent.click(await screen.findByRole("option", { name: "식비" }));
      fireEvent.click(within(editor).getByRole("button", { name: "완료" }));
      await waitFor(() =>
        expect(
          screen.queryByRole("dialog", { name: "기록 수정" }),
        ).not.toBeInTheDocument(),
      );
    };
    fireEvent.click(
      await screen.findByRole("button", { name: /내용을 입력해 주세요/ }),
    );
    await fillEditor(1, "A", "1000");
    fireEvent.click(screen.getByRole("button", { name: "기록 추가" }));
    await fillEditor(2, "B", "2000");
    expect(
      screen.getAllByRole("button", { name: /번째 기록 삭제/ }),
    ).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "모두 저장" }));
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(1));
    expect(
      createBatch.mock.calls[0]?.[0].entries.map(
        (entry: { title: string }) => entry.title,
      ),
    ).toEqual(["A", "B"]);
  });

  it("keeps an initialized draft visible when its starting book becomes archived", async () => {
    const view = renderComposer();
    const title = await screen.findByLabelText("내용 1");
    fireEvent.change(title, { target: { value: "보관 후에도 남길 기록" } });
    fireEvent.change(screen.getByLabelText("금액 1"), {
      target: { value: "2500" },
    });
    mockBooks[0]!.archivedAt = "2026-10-05T00:00:00.000Z";
    view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <LedgerEntryComposer
          mode="daily"
          defaultDate="2026-06-05"
          sourceBookId="11111111-1111-4111-8111-111111111111"
        />
      </QueryClientProvider>,
    );
    expect(await screen.findByLabelText("내용 1")).toHaveValue(
      "보관 후에도 남길 기록",
    );
    expect(screen.getByLabelText("금액 1")).toHaveValue(2500);
  });

  it("blocks an invalid scoped book without falling back to another active book", async () => {
    renderComposer("33333333-3333-4333-8333-333333333333");
    expect(
      await screen.findByText("이 장부에서는 새 기록을 추가할 수 없습니다."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("내용 1")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "이전 화면으로" }),
    ).toBeInTheDocument();
  });

  it("routes tablet header back through the dirty draft confirmation", async () => {
    media.desktop = true;
    media.tablet = true;
    renderComposer();
    const row = await screen.findByRole("button", {
      name: /내용을 입력해 주세요/,
    });
    expect(
      screen.queryByRole("button", { name: "다음" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "모두 저장" })).toHaveLength(
      1,
    );
    fireEvent.click(row);
    const editor = await screen.findByRole("dialog", { name: "기록 수정" });
    fireEvent.change(within(editor).getByLabelText("내용"), {
      target: { value: "태블릿에서 수정" },
    });
    fireEvent(window, new CustomEvent("oat:ledger-composer-back"));
    expect(
      await screen.findByRole("heading", {
        name: "입력 중인 내용을 버릴까요?",
      }),
    ).toBeInTheDocument();
    expect(within(editor).getByLabelText("내용")).toHaveValue(
      "태블릿에서 수정",
    );
  });

  it("uses the desktop category combobox for inline creation and labels the edit dialog", async () => {
    const user = userEvent.setup();
    media.desktop = true;
    createCategory.mockResolvedValueOnce({
      id: "new-category",
      name: "반려동물",
      type: "expense",
      icon: null,
    });
    renderComposer();
    fireEvent.click(
      await screen.findByRole("button", { name: /내용을 입력해 주세요/ }),
    );
    expect(
      screen.getByRole("dialog", {
        name: "기록 수정",
        description: "기록의 유형과 내용을 수정합니다.",
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "카테고리 1" }));
    await user.type(
      screen.getByPlaceholderText("카테고리 이름 검색"),
      "반려동물",
    );
    await user.click(
      screen
        .getAllByRole("button", { name: '"반려동물" 새 카테고리 추가' })
        .at(-1)!,
    );
    await user.click(screen.getByRole("button", { name: "추가" }));
    expect(createCategory).toHaveBeenCalledWith({
      type: "expense",
      name: "반려동물",
      icon: null,
    });
  });

  it("keeps mixed expense and income rows in Review, validates a changed type, then adds a row", async () => {
    renderComposer();
    fireEvent.change(await screen.findByLabelText("내용 1"), {
      target: { value: "점심" },
    });
    fireEvent.change(screen.getByLabelText("금액 1"), {
      target: { value: "8000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "기록 추가" }));
    fireEvent.change(screen.getByLabelText("내용 2"), {
      target: { value: "급여" },
    });
    fireEvent.change(screen.getByLabelText("금액 2"), {
      target: { value: "100000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(
      await screen.findByRole("combobox", { name: "카테고리 1" }),
    );
    fireEvent.click(await screen.findByRole("option", { name: "식비" }));
    fireEvent.click(screen.getByRole("combobox", { name: "기록 유형 2" }));
    fireEvent.click(await screen.findByRole("option", { name: "수입" }));
    fireEvent.click(screen.getByRole("combobox", { name: "카테고리 2" }));
    fireEvent.click(await screen.findByRole("option", { name: "급여" }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(
      await screen.findByRole("combobox", { name: "입금 계좌 2" }),
    );
    fireEvent.click(
      await screen.findByRole("option", { name: /^주거래 통장/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(await screen.findByRole("button", { name: "입력 확인" }));
    expect(
      await screen.findByRole("heading", { name: "입력 확인" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "기록 1 내용 수정: 점심" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "기록 2 내용 수정: 급여" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "기록 2 분류 수정: 급여" }),
    );
    fireEvent.click(
      await screen.findByRole("combobox", { name: "기록 유형 2" }),
    );
    fireEvent.click(await screen.findByRole("option", { name: "지출" }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "카테고리를 선택해 주세요.",
    );
    fireEvent.click(screen.getByRole("combobox", { name: "카테고리 2" }));
    fireEvent.click(await screen.findByRole("option", { name: "식비" }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(
      await screen.findByRole("heading", { name: "입력 확인" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "기록 추가" }));
    expect(await screen.findByLabelText("내용 3")).toBeInTheDocument();
  });

  it("retains review drafts through an archived-book API error and refresh, then renews the request key after changing books", async () => {
    const user = userEvent.setup();
    createBatch
      .mockRejectedValueOnce(
        new (await import("@/lib/api/client")).ApiQueryError(
          "BOOK_ARCHIVED",
          "보관된 장부입니다.",
          409,
        ),
      )
      .mockResolvedValueOnce({ count: 2 });
    renderComposer();
    const title1 = await screen.findByLabelText("내용 1");
    fireEvent.change(title1, { target: { value: "첫째 식비" } });
    fireEvent.change(screen.getByLabelText("금액 1"), {
      target: { value: "2500" },
    });
    fireEvent.click(screen.getByRole("button", { name: "기록 추가" }));
    fireEvent.change(screen.getByLabelText("내용 2"), {
      target: { value: "둘째 식비" },
    });
    fireEvent.change(screen.getByLabelText("금액 2"), {
      target: { value: "3500" },
    });
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    for (const row of [1, 2]) {
      const trigger = await screen.findByRole("combobox", {
        name: `카테고리 ${row}`,
      });
      fireEvent.click(trigger);
      const option = await screen.findByRole("option", { name: "식비" });
      fireEvent.click(option);
      await waitFor(() => expect(trigger).toHaveTextContent("식비"));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }
    await user.click(await screen.findByRole("button", { name: "다음" }));
    await user.click(await screen.findByRole("button", { name: "다음" }));
    await user.click(await screen.findByRole("button", { name: "입력 확인" }));
    expect(
      await screen.findByRole("heading", { name: "입력 확인" }),
    ).toBeInTheDocument();
    const save = await screen.findByRole("button", { name: "모두 저장" });
    fireEvent.click(save);
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(1));
    const firstRequestId = createBatch.mock.calls[0]?.[0].requestId;
    mockBooks[0]!.archivedAt = "2026-10-05T00:00:00.000Z";
    expect(
      await screen.findByRole("heading", { name: "입력 확인" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "기록 1 내용 수정: 첫째 식비" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "기록 2 내용 수정: 둘째 식비" }),
    ).toBeInTheDocument();
    const editDates = screen.getByRole("button", {
      name: "기록 1 날짜와 장부 수정: 2026-06-05, 공용 생활비",
    });
    fireEvent.click(editDates);
    const bookPicker = await screen.findByRole("combobox", { name: "장부 1" });
    expect(bookPicker).toHaveTextContent("공용 생활비 (보관됨)");
    expect(bookPicker).toBeEnabled();
    fireEvent.click(bookPicker);
    const archivedOption = screen.getByRole("button", {
      name: /^공용 생활비 \(보관됨\)/,
    });
    expect(archivedOption).toBeDisabled();
    const personalOption = await screen.findByRole("button", {
      name: /^개인 장부개인/,
    });
    expect(personalOption).toBeEnabled();
    fireEvent.click(personalOption);
    await waitFor(() => expect(bookPicker).toHaveTextContent("개인 장부"));
    fireEvent.click(screen.getByRole("button", { name: "입력 확인" }));
    expect(
      await screen.findByRole("heading", { name: "입력 확인" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "기록 2 날짜와 장부 수정: 2026-06-05, 공용 생활비",
      }),
    );
    const secondBookPicker = await screen.findByRole("combobox", {
      name: "장부 2",
    });
    expect(secondBookPicker).toHaveTextContent("공용 생활비 (보관됨)");
    fireEvent.click(secondBookPicker);
    fireEvent.click(
      await screen.findByRole("button", { name: /^개인 장부개인/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "입력 확인" }));
    expect(
      await screen.findByRole("heading", { name: "입력 확인" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "모두 저장" }));
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(2));
    expect(createBatch.mock.calls[1]?.[0].requestId).not.toBe(firstRequestId);
  });

  it("reuses the request key for an unchanged transient retry and renews it after an edit", async () => {
    const user = userEvent.setup();
    createBatch
      .mockRejectedValueOnce(new Error("일시적인 오류"))
      .mockRejectedValueOnce(new Error("일시적인 오류"))
      .mockResolvedValueOnce({ count: 1 });
    renderComposer();
    fireEvent.change(await screen.findByLabelText("내용 1"), {
      target: { value: "키 유지" },
    });
    fireEvent.change(screen.getByLabelText("금액 1"), {
      target: { value: "1500" },
    });
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    const category = await screen.findByRole("combobox", {
      name: "카테고리 1",
    });
    fireEvent.click(category);
    fireEvent.click(await screen.findByRole("option", { name: "식비" }));
    await waitFor(() => expect(category).toHaveTextContent("식비"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const save = await screen.findByRole("button", { name: "저장" });
    await user.click(save);
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(1));
    const firstRequestId = createBatch.mock.calls[0]?.[0].requestId;
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(2));
    expect(createBatch.mock.calls[1]?.[0].requestId).toBe(firstRequestId);
    fireEvent.click(screen.getByRole("combobox", { name: "카테고리 1" }));
    fireEvent.click(await screen.findByRole("option", { name: "교통비" }));
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "카테고리 1" }),
      ).toHaveTextContent("교통비"),
    );
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(3));
    expect(createBatch.mock.calls[2]?.[0].requestId).not.toBe(firstRequestId);
  });
});
