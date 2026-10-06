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
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StockTradeComposer } from "./StockTradeComposer";

const routerPush = vi.fn();
const routerReplace = vi.fn();
const router = { push: routerPush, replace: routerReplace };
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
  useMediaQuery: () => true,
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

const EDITOR = "거래 입력";
const SEARCH_PLACEHOLDER = "종목명, 티커, 초성으로 검색해보세요";

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

function getEditor() {
  return screen.getByRole("dialog", { name: EDITOR });
}

async function pickStock(row: number, name: string) {
  const group = within(getEditor()).getByRole("group", { name: `종목 ${row}` });
  fireEvent.click(within(group).getByRole("button"));
  const search = await screen.findByPlaceholderText(SEARCH_PLACEHOLDER);
  fireEvent.change(search, { target: { value: name } });
  fireEvent.click(
    await screen.findByRole(
      "option",
      { name: new RegExp(name) },
      { timeout: 2000 },
    ),
  );
  await waitFor(() =>
    expect(screen.queryByPlaceholderText(SEARCH_PLACEHOLDER)).toBeNull(),
  );
}

async function fillTrade(
  row: number,
  {
    type = "매수",
    stock = "Apple",
    quantity = "3",
    price = "195.5",
  }: {
    type?: "매수" | "매도";
    stock?: string;
    quantity?: string;
    price?: string;
  } = {},
) {
  const editor = await screen.findByRole("dialog", { name: EDITOR });
  fireEvent.click(
    within(
      within(editor).getByRole("radiogroup", { name: `매수/매도 ${row}` }),
    ).getByRole("radio", { name: type }),
  );
  await pickStock(row, stock);
  fireEvent.change(within(getEditor()).getByLabelText(`수량 ${row}`), {
    target: { value: quantity },
  });
  fireEvent.change(within(getEditor()).getByLabelText(`단가 ${row}`), {
    target: { value: price },
  });
}

async function completeEditor() {
  fireEvent.click(within(getEditor()).getByRole("button", { name: "완료" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: EDITOR })).toBeNull(),
  );
}

async function openFirstRow() {
  fireEvent.click(
    await screen.findByRole("button", { name: /종목을 선택해 주세요/ }),
  );
  return screen.findByRole("dialog", { name: EDITOR });
}

describe("stock trade composer (desktop)", () => {
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
    window.history.replaceState(null, "", window.location.href);
  });

  it("shows a compact list instead of the old editor and edits a row in a dialog", async () => {
    renderComposer();
    expect(
      await screen.findByRole("button", { name: "모두 저장" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "다음" }),
    ).not.toBeInTheDocument();

    const editor = await openFirstRow();
    expect(
      within(editor).getByRole("button", { name: "거래일 1" }),
    ).toHaveTextContent("2026년 6월 5일");
    expect(within(editor).getByRole("combobox")).toHaveTextContent("주식 계좌");
    expect(within(editor).getByLabelText("메모 1")).toBeInTheDocument();
    await fillTrade(1);
    await completeEditor();

    const row = screen.getByRole("button", { name: /Apple/ });
    expect(row).toHaveTextContent("매수 · 주식 계좌 · 2026-06-05");
    expect(row).toHaveTextContent(/3주 × US\$195\.50/);
    expect(screen.getByText("US$586.50")).toBeInTheDocument();
  });

  it("blocks Done and names every missing value", async () => {
    renderComposer();
    const editor = await openFirstRow();
    fireEvent.click(within(editor).getByRole("button", { name: "완료" }));

    expect(
      await within(editor).findByText("매수 또는 매도를 선택해 주세요."),
    ).toBeInTheDocument();
    expect(
      within(editor).getByText("종목을 선택해 주세요."),
    ).toBeInTheDocument();
    expect(
      within(editor).getByText("유효한 수량을 입력해 주세요."),
    ).toBeInTheDocument();
    expect(
      within(editor).getByText("유효한 단가를 입력해 주세요."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: EDITOR })).toBeInTheDocument();
    await waitFor(() =>
      expect(within(editor).getByRole("radio", { name: "매수" })).toHaveFocus(),
    );
  });

  it("adds a row with its own dialog and drops it again on cancel", async () => {
    renderComposer();
    await openFirstRow();
    await fillTrade(1);
    await completeEditor();

    fireEvent.click(screen.getByRole("button", { name: "종목 추가" }));
    const editor = await screen.findByRole("dialog", { name: EDITOR });
    fireEvent.change(within(editor).getByLabelText("수량 2"), {
      target: { value: "9" },
    });
    fireEvent.click(within(editor).getByRole("button", { name: "취소" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: EDITOR })).toBeNull(),
    );
    expect(
      screen.getAllByRole("button", { name: /번째 거래 삭제/ }),
    ).toHaveLength(1);
  });

  it("restores a row to how it was before the dialog opened on cancel", async () => {
    renderComposer();
    await openFirstRow();
    await fillTrade(1);
    await completeEditor();

    fireEvent.click(screen.getByRole("button", { name: /Apple/ }));
    const editor = await screen.findByRole("dialog", { name: EDITOR });
    fireEvent.click(within(editor).getByRole("radio", { name: "매도" }));
    fireEvent.change(within(editor).getByLabelText("수량 1"), {
      target: { value: "10" },
    });
    fireEvent.click(within(editor).getByRole("button", { name: "취소" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: EDITOR })).toBeNull(),
    );

    const row = screen.getByRole("button", { name: /Apple/ });
    expect(row).toHaveTextContent("매수 · 주식 계좌");
    expect(row).toHaveTextContent(/3주/);
  });

  it("saves every row with its own type, date, account and currency", async () => {
    const user = userEvent.setup();
    createBatch.mockResolvedValue([]);
    renderComposer();
    await openFirstRow();
    await fillTrade(1, { type: "매도", stock: "삼성전자", price: "70000" });
    await completeEditor();

    fireEvent.click(screen.getByRole("button", { name: "종목 추가" }));
    await fillTrade(2);
    const editor = getEditor();
    await user.click(within(editor).getByRole("button", { name: "거래일 2" }));
    await user.click(within(await screen.findByRole("grid")).getByText("7"));
    await user.keyboard("{Escape}");
    fireEvent.click(within(getEditor()).getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: /연금 계좌/ }));
    expect(
      screen.queryByRole("option", { name: /배우자 계좌/ }),
    ).not.toBeInTheDocument();
    fireEvent.change(within(getEditor()).getByLabelText("메모 2"), {
      target: { value: "리밸런싱" },
    });
    await completeEditor();

    fireEvent.click(screen.getByRole("button", { name: "모두 저장" }));
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(1));
    const input = createBatch.mock.calls[0]?.[0];
    expect(input.items).toEqual([
      {
        type: "sell",
        ticker: "005930",
        quantity: 3,
        price: 70000,
        memo: undefined,
        transactedAt: "2026-06-05T00:00:00.000Z",
        accountId: ACCOUNT_A,
        stock: {
          name: "삼성전자",
          market: "KR",
          currency: "KRW",
          assetType: "equity",
        },
      },
      {
        type: "buy",
        ticker: "AAPL",
        quantity: 3,
        price: 195.5,
        memo: "리밸런싱",
        transactedAt: "2026-06-07T00:00:00.000Z",
        accountId: ACCOUNT_B,
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
    expect(toastSuccess).toHaveBeenCalledWith("거래 2건이 저장되었습니다.");
    await waitFor(
      () =>
        expect(routerReplace).toHaveBeenCalledWith(
          "/assets/stock/transactions",
        ),
      { timeout: 3000 },
    );
  });

  it("opens the first incomplete row with its missing values instead of saving", async () => {
    renderComposer();
    fireEvent.click(await screen.findByRole("button", { name: "종목 추가" }));
    await fillTrade(2);
    await completeEditor();

    fireEvent.click(screen.getByRole("button", { name: "모두 저장" }));
    const editor = await screen.findByRole("dialog", { name: EDITOR });
    expect(
      within(editor).getByRole("radiogroup", { name: "매수/매도 1" }),
    ).toBeInTheDocument();
    expect(
      within(editor).getByText("매수 또는 매도를 선택해 주세요."),
    ).toBeInTheDocument();
    expect(createBatch).not.toHaveBeenCalled();
  });

  it("removes a row from the list", async () => {
    renderComposer();
    fireEvent.click(await screen.findByRole("button", { name: "종목 추가" }));
    await fillTrade(2);
    await completeEditor();
    fireEvent.click(screen.getByRole("button", { name: "2번째 거래 삭제" }));
    expect(screen.queryByRole("button", { name: /Apple/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "1번째 거래 삭제" }));
    expect(screen.getByRole("button", { name: "모두 저장" })).toBeDisabled();
  });

  it("prefills the daily date on new rows and returns to that day's records", async () => {
    createBatch.mockResolvedValue([]);
    renderComposer({ mode: "daily", defaultDate: "2026-06-03" });
    await openFirstRow();
    await fillTrade(1);
    await completeEditor();
    fireEvent.click(screen.getByRole("button", { name: "종목 추가" }));
    const editor = await screen.findByRole("dialog", { name: EDITOR });
    expect(
      within(editor).getByRole("button", { name: "거래일 2" }),
    ).toHaveTextContent("2026년 6월 3일");
    await fillTrade(2, { stock: "삼성전자", price: "70000" });
    await completeEditor();

    fireEvent.click(screen.getByRole("button", { name: "모두 저장" }));
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(1));
    expect(
      createBatch.mock.calls[0]?.[0].items.map(
        (item: { transactedAt: string }) => item.transactedAt,
      ),
    ).toEqual(["2026-06-03T00:00:00.000Z", "2026-06-03T00:00:00.000Z"]);
    await waitFor(
      () =>
        expect(routerReplace).toHaveBeenCalledWith(
          "/assets/stock/records?date=2026-06-03",
        ),
      { timeout: 3000 },
    );
  });

  it("asks before leaving through header back and keeps the draft on cancel", async () => {
    renderComposer();
    await openFirstRow();
    await fillTrade(1);
    await completeEditor();

    fireEvent(window, new CustomEvent("oat:composer-back"));
    fireEvent.click(await screen.findByRole("button", { name: "계속 입력" }));
    expect(screen.getByRole("button", { name: /Apple/ })).toBeInTheDocument();

    fireEvent(window, new CustomEvent("oat:composer-back"));
    fireEvent.click(await screen.findByRole("button", { name: "내용 버리기" }));
    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith("/assets/stock/transactions"),
    );
  });

  it("asks before leaving through browser back", async () => {
    renderComposer();
    await openFirstRow();
    await fillTrade(1);
    await completeEditor();
    window.history.back();
    expect(
      await screen.findByRole("button", { name: "내용 버리기" }),
    ).toBeInTheDocument();
  });

  it("guards an internal app link and keeps its destination for discard", async () => {
    renderComposer();
    await openFirstRow();
    await fillTrade(1);
    await completeEditor();
    const link = document.createElement("a");
    link.href = "/assets";
    document.body.append(link);
    fireEvent.click(link);
    fireEvent.click(await screen.findByRole("button", { name: "내용 버리기" }));
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/assets"));
    link.remove();
  });

  it("saves once on a double click", async () => {
    let resolveSave: (value: unknown) => void = () => {};
    createBatch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    renderComposer();
    await openFirstRow();
    await fillTrade(1);
    await completeEditor();
    const save = screen.getByRole("button", { name: "모두 저장" });
    act(() => {
      save.click();
      save.click();
    });
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "저장 중..." })).toBeDisabled();
    resolveSave([]);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(createBatch).toHaveBeenCalledTimes(1);
  });

  it("keeps the list after a failed save and reuses the request key on retry", async () => {
    createBatch
      .mockRejectedValueOnce(new Error("해당 계좌의 보유 수량이 부족합니다."))
      .mockResolvedValueOnce([]);
    renderComposer();
    await openFirstRow();
    await fillTrade(1, { type: "매도" });
    await completeEditor();

    fireEvent.click(screen.getByRole("button", { name: "모두 저장" }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "해당 계좌의 보유 수량이 부족합니다.",
      ),
    );
    expect(screen.getByRole("button", { name: /Apple/ })).toHaveTextContent(
      "매도 · 주식 계좌",
    );
    fireEvent.click(screen.getByRole("button", { name: "모두 저장" }));
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(2));
    expect(createBatch.mock.calls[1]?.[0].requestId).toBe(
      createBatch.mock.calls[0]?.[0].requestId,
    );
  });
});
