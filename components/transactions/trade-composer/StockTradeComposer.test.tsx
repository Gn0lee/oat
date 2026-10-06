import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StockTradeComposer } from "./StockTradeComposer";

const routerPush = vi.fn();
const routerReplace = vi.fn();
const router = { push: routerPush, replace: routerReplace };
const media = vi.hoisted(() => ({ desktop: false }));
const { createBatch, toastSuccess, toastError } = vi.hoisted(() => ({
  createBatch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
const STOCKS = [
  {
    id: "stock-aapl",
    code: "AAPL",
    name: "Apple",
    name_en: null,
    market: "US",
    exchange: "NASDAQ",
  },
  {
    id: "stock-samsung",
    code: "005930",
    name: "삼성전자",
    name_en: null,
    market: "KR",
    exchange: "KOSPI",
  },
];
const ACCOUNT_A = "00000000-0000-4000-8000-00000000000a";
const ACCOUNT_B = "00000000-0000-4000-8000-00000000000b";

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/assets/stock/transactions/new/full",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => media.desktop,
}));
vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUserId: () => ({ userId: "user-1", isLoading: false }),
}));
vi.mock("@/hooks/use-accounts", () => ({
  useAccounts: () => ({
    isLoading: false,
    data: [
      {
        id: ACCOUNT_A,
        name: "주식 계좌",
        broker: "키움",
        ownerId: "user-1",
        ownerName: "작성자",
        lastFour: null,
      },
      {
        id: ACCOUNT_B,
        name: "연금 계좌",
        broker: "미래",
        ownerId: "user-1",
        ownerName: "작성자",
        lastFour: null,
      },
      {
        id: "00000000-0000-4000-8000-00000000000c",
        name: "배우자 계좌",
        broker: "삼성",
        ownerId: "user-2",
        ownerName: "배우자",
        lastFour: null,
      },
    ],
  }),
  useCreateAccount: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/use-stock-search", () => ({
  useStockSearch: ({ query }: { query: string }) => ({
    data: query ? STOCKS : [],
    isLoading: false,
    isFetching: false,
  }),
}));
vi.mock("@/hooks/use-transaction", () => ({
  useCreateBatchTransactions: () => ({
    mutateAsync: createBatch,
    isPending: false,
  }),
}));
vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  DrawerContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DrawerDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

function renderComposer(
  props: { mode: "full" | "daily"; defaultDate?: string } = {
    mode: "full",
    defaultDate: "2026-06-05",
  },
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <StockTradeComposer {...props} />
    </QueryClientProvider>,
  );
}

async function pickStock(row: number, name: string) {
  const group = await screen.findByRole("group", { name: `종목 ${row}` });
  fireEvent.click(within(group).getByRole("button"));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(
    within(dialog).getByPlaceholderText("종목명, 티커, 초성으로 검색해보세요"),
    { target: { value: name } },
  );
  fireEvent.click(
    await within(dialog).findByRole(
      "option",
      { name: new RegExp(name) },
      { timeout: 2000 },
    ),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

async function fillBasics({
  type = "매수",
  stock = "Apple",
  quantity = "3",
  price = "195.5",
}: {
  type?: "매수" | "매도";
  stock?: string;
  quantity?: string;
  price?: string;
} = {}) {
  fireEvent.click(
    within(
      await screen.findByRole("radiogroup", { name: "매수/매도 1" }),
    ).getByRole("radio", { name: type }),
  );
  await pickStock(1, stock);
  fireEvent.change(screen.getByLabelText("수량 1"), {
    target: { value: quantity },
  });
  fireEvent.change(screen.getByLabelText("단가 1"), {
    target: { value: price },
  });
}

async function goToDetails() {
  await fillBasics();
  fireEvent.click(screen.getByRole("button", { name: "다음" }));
  return screen.findByRole("heading", { name: "상세 입력" });
}

describe("stock trade composer (mobile, one trade)", () => {
  beforeEach(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    Element.prototype.scrollIntoView = vi.fn();
    createBatch.mockReset();
    routerPush.mockReset();
    routerReplace.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    media.desktop = false;
    window.history.replaceState(null, "", window.location.href);
  });

  it("starts with no buy/sell chosen and blocks Next until one is picked", async () => {
    renderComposer();
    const typeGroup = await screen.findByRole("radiogroup", {
      name: "매수/매도 1",
    });
    for (const radio of within(typeGroup).getAllByRole("radio")) {
      expect(radio).toHaveAttribute("aria-checked", "false");
    }
    await pickStock(1, "Apple");
    fireEvent.change(screen.getByLabelText("수량 1"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("단가 1"), {
      target: { value: "195.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(
      await screen.findByText("매수 또는 매도를 선택해 주세요."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "상세 입력" }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(typeGroup).getByRole("radio", { name: "매수" }),
      ).toHaveFocus(),
    );

    fireEvent.click(within(typeGroup).getByRole("radio", { name: "매도" }));
    expect(
      screen.queryByText("매수 또는 매도를 선택해 주세요."),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(
      await screen.findByRole("heading", { name: "상세 입력" }),
    ).toBeInTheDocument();
  });

  it("names every missing basics value and focuses the first numeric field", async () => {
    renderComposer();
    fireEvent.click(
      within(
        await screen.findByRole("radiogroup", { name: "매수/매도 1" }),
      ).getByRole("radio", { name: "매수" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(
      await screen.findByText("종목을 선택해 주세요."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("유효한 수량을 입력해 주세요."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("유효한 단가를 입력해 주세요."),
    ).toBeInTheDocument();
    await pickStock(1, "Apple");
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() => expect(screen.getByLabelText("수량 1")).toHaveFocus());
  });

  it("shows dollars for a US stock, summarizes the trade and saves it as USD", async () => {
    createBatch.mockResolvedValue([]);
    renderComposer();
    await fillBasics();
    expect(screen.getByText("단가 ($)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    const details = (
      await screen.findByRole("heading", { name: "상세 입력" })
    ).closest("section") as HTMLElement;
    expect(within(details).getByText(/Apple/)).toBeInTheDocument();
    expect(within(details).getByText(/3주 × US\$195\.50/)).toBeInTheDocument();
    expect(within(details).getByText("US$586.50")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "거래일 1" })).toHaveTextContent(
      "2026년 6월 5일",
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("주식 계좌");

    fireEvent.change(screen.getByLabelText("메모 1"), {
      target: { value: "첫 매수" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(1));
    const input = createBatch.mock.calls[0]?.[0];
    expect(input.items).toEqual([
      {
        type: "buy",
        ticker: "AAPL",
        quantity: 3,
        price: 195.5,
        memo: "첫 매수",
        transactedAt: "2026-06-05T00:00:00.000Z",
        accountId: ACCOUNT_A,
        stock: {
          name: "Apple",
          market: "US",
          currency: "USD",
          assetType: "equity",
        },
      },
    ]);
    expect(input.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    await waitFor(
      () =>
        expect(routerReplace).toHaveBeenCalledWith(
          "/assets/stock/transactions",
        ),
      { timeout: 3000 },
    );
  });

  it("offers only my accounts and saves the one I pick, in KRW for a KR sell", async () => {
    createBatch.mockResolvedValue([]);
    renderComposer();
    await fillBasics({ type: "매도", stock: "삼성전자", price: "70000" });
    expect(screen.getByText("단가 (원)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByRole("heading", { name: "상세 입력" });

    fireEvent.click(screen.getByRole("combobox"));
    const picker = await screen.findByRole("dialog");
    expect(
      within(picker).queryByRole("option", { name: /배우자 계좌/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(within(picker).getByRole("option", { name: /연금 계좌/ }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(1));
    expect(createBatch.mock.calls[0]?.[0].items[0]).toMatchObject({
      type: "sell",
      ticker: "005930",
      accountId: ACCOUNT_B,
      stock: { currency: "KRW", assetType: "equity" },
    });
  });

  it("prefills the daily date, lets it change, and returns to that day's records", async () => {
    const user = userEvent.setup();
    createBatch.mockResolvedValue([]);
    renderComposer({ mode: "daily", defaultDate: "2026-06-05" });
    await goToDetails();
    const date = screen.getByRole("button", { name: "거래일 1" });
    expect(date).toHaveTextContent("2026년 6월 5일");

    await user.click(date);
    const calendar = await screen.findByRole("grid");
    await user.click(within(calendar).getByText("7"));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "거래일 1" }),
      ).toHaveTextContent("2026년 6월 7일"),
    );
    await user.keyboard("{Escape}");
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(1));
    expect(createBatch.mock.calls[0]?.[0].items[0].transactedAt).toBe(
      "2026-06-07T00:00:00.000Z",
    );
    await waitFor(
      () =>
        expect(routerReplace).toHaveBeenCalledWith(
          "/assets/stock/records?date=2026-06-07",
        ),
      { timeout: 3000 },
    );
  });

  it("goes back one step with header back and keeps the entered values", async () => {
    renderComposer();
    await goToDetails();
    fireEvent(window, new CustomEvent("oat:composer-back"));
    expect(await screen.findByLabelText("수량 1")).toHaveValue(3);
    expect(screen.getByLabelText("단가 1")).toHaveValue(195.5);
    expect(
      within(screen.getByRole("radiogroup", { name: "매수/매도 1" })).getByRole(
        "radio",
        { name: "매수" },
      ),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      within(screen.getByRole("group", { name: "종목 1" })).getByRole("button"),
    ).toHaveTextContent("Apple");
  });

  it("goes back one step with browser back", async () => {
    renderComposer();
    await goToDetails();
    window.history.back();
    expect(await screen.findByLabelText("수량 1")).toHaveValue(3);
  });

  it("asks before leaving from the first step and keeps the draft on cancel", async () => {
    renderComposer();
    fireEvent.change(await screen.findByLabelText("수량 1"), {
      target: { value: "5" },
    });
    fireEvent(window, new CustomEvent("oat:composer-back"));
    fireEvent.click(await screen.findByRole("button", { name: "계속 입력" }));
    expect(screen.getByLabelText("수량 1")).toHaveValue(5);

    fireEvent(window, new CustomEvent("oat:composer-back"));
    fireEvent.click(await screen.findByRole("button", { name: "내용 버리기" }));
    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith("/assets/stock/transactions"),
    );
  });

  it("guards an internal app link and keeps its destination for discard", async () => {
    renderComposer();
    fireEvent.change(await screen.findByLabelText("수량 1"), {
      target: { value: "5" },
    });
    const link = document.createElement("a");
    link.href = "/assets";
    document.body.append(link);
    fireEvent.click(link);
    fireEvent.click(await screen.findByRole("button", { name: "내용 버리기" }));
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/assets"));
    link.remove();
  });

  it("saves once on a double tap", async () => {
    let resolveSave: (value: unknown) => void = () => {};
    createBatch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    renderComposer();
    await goToDetails();
    const save = screen.getByRole("button", { name: "저장" });
    // 두 번 누르는 사이에 화면이 다시 그려지지 않는 빠른 연타
    act(() => {
      save.click();
      save.click();
    });
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(1));
    resolveSave([]);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(createBatch).toHaveBeenCalledTimes(1);
  });

  it("keeps the input after a failed save, reuses the request key on retry and renews it after an edit", async () => {
    createBatch
      .mockRejectedValueOnce(new Error("해당 계좌의 보유 수량이 부족합니다."))
      .mockRejectedValueOnce(new Error("일시적인 오류"))
      .mockResolvedValueOnce([]);
    renderComposer();
    await goToDetails();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "해당 계좌의 보유 수량이 부족합니다.",
      ),
    );
    expect(
      screen.getByRole("heading", { name: "상세 입력" }),
    ).toBeInTheDocument();
    const firstRequestId = createBatch.mock.calls[0]?.[0].requestId;

    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(2));
    expect(createBatch.mock.calls[1]?.[0].requestId).toBe(firstRequestId);

    fireEvent(window, new CustomEvent("oat:composer-back"));
    fireEvent.change(await screen.findByLabelText("수량 1"), {
      target: { value: "2" },
    });
    expect(screen.getByLabelText("단가 1")).toHaveValue(195.5);
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(await screen.findByRole("button", { name: "저장" }));
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(3));
    expect(createBatch.mock.calls[2]?.[0].items[0].quantity).toBe(2);
    expect(createBatch.mock.calls[2]?.[0].requestId).not.toBe(firstRequestId);
  });
});
